import { apiSuccess } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, listActiveProfilesBasic } from '../lib/database';
import { getCurrentWeekWindow, getCurrentWeekStart, getPastWeekWindows } from '../lib/weekCycle';
import type { User } from '../types/user';
import { notificationsApi } from './notifications';

export interface WeeklyPaper {
  id: number;
  title: string;
  uploader_id: string;
  uploader: { real_name: string; username: string };
  created_at: string;
}

export interface MemberWeekStatus {
  user: Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>;
  completed: boolean;   // has commented on ≥1 paper this week
  on_leave: boolean;    // has approved leave this week
  is_uploader: boolean; // uploaded a paper this week (auto-complete)
}

export interface WeeklyTaskSummary {
  week_start: string;
  week_end: string;
  papers: WeeklyPaper[];
  members: MemberWeekStatus[];
  completed_count: number;
  total_count: number;
}

export interface MemberAttendance {
  user: Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>;
  current_week_status: 'completed' | 'on_leave' | 'pending';
  two_week_comments: number;   // 本周+上周评论总数（滚动两周）
  total_completed: number;     // total weeks completed out of last 8
}

/**
 * Fetch full weekly task summary for the current week.
 */
export const weeklyTasksApi = {
  async getCurrentWeekSummary(): Promise<{ data: { data: WeeklyTaskSummary } }> {
    const { start, end } = getCurrentWeekWindow();
    const weekStart = start.toISOString();
    const weekEnd = end.toISOString();

    // Papers uploaded this week
    const { data: papersData, error: papersError } = await supabase
      .from('papers')
      .select('id, title, uploader_id, created_at, uploader:profiles!papers_uploader_id_fkey(real_name, username)')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)
      .order('created_at', { ascending: true });

    if (papersError) throw new Error(papersError.message || '获取本周文献失败');

    const papers = (papersData || []).map((p: any) => ({
      ...p,
      uploader: Array.isArray(p.uploader) ? p.uploader[0] : p.uploader,
    })) as WeeklyPaper[];
    const paperIds = papers.map((p) => p.id);

    // Comments on those papers (to determine completion)
    let commenterIds = new Set<string>();
    if (paperIds.length > 0) {
      const { data: commentsData } = await supabase
        .from('comments')
        .select('user_id')
        .in('paper_id', paperIds);
      (commentsData || []).forEach((c: any) => commenterIds.add(c.user_id));
    }

    // Uploader IDs (uploading counts as task completion)
    const uploaderIds = new Set(papers.map((p) => p.uploader_id));

    // Active members
    const activeMembers = await listActiveProfilesBasic();

    // Long-term approved leave overlapping this window exempts from weekly task
    // Short-term leave does NOT exempt
    const { data: leaveData } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('status', 'approved')
      .eq('leave_type', 'long_term')
      .lte('start_time', weekEnd)
      .gte('end_time', weekStart);
    const leaveUserIds = new Set((leaveData || []).map((l: any) => l.user_id));

    const members: MemberWeekStatus[] = activeMembers.map((member) => {
      const isUploader = uploaderIds.has(member.id);
      const hasCommented = commenterIds.has(member.id);
      const onLeave = leaveUserIds.has(member.id);
      return {
        user: member,
        completed: hasCommented || onLeave,   // 上传不算完成，只有评论才算
        on_leave: onLeave,
        is_uploader: isUploader,
      };
    });

    const completed_count = members.filter((m) => m.completed).length;

    return apiSuccess({
      week_start: start.format('YYYY-MM-DD'),
      week_end: end.format('YYYY-MM-DD HH:mm'),
      papers,
      members,
      completed_count,
      total_count: members.length,
    });
  },

  /**
   * Attendance stats for all members across last 8 weeks.
   */
  async getAttendanceStats(): Promise<{ data: { data: MemberAttendance[] } }> {
    const windows = getPastWeekWindows(8);
    const activeMembers = await listActiveProfilesBasic();

    // For each window, collect paper IDs, comment counts per user, uploader IDs, leave IDs
    const windowData: {
      commentCountMap: Map<string, number>;
      uploaderIds: Set<string>;
      leaveIds: Set<string>;
      weekStart: string;
    }[] = [];

    for (const w of windows) {
      const weekStart = w.start.format('YYYY-MM-DD');
      const { data: papersData } = await supabase
        .from('papers')
        .select('id, uploader_id')
        .gte('created_at', w.start.toISOString())
        .lte('created_at', w.end.toISOString());

      const paperIds = (papersData || []).map((p: any) => p.id);
      const uploaderIds = new Set<string>((papersData || []).map((p: any) => p.uploader_id));

      // Count comments per user (not just presence)
      const commentCountMap = new Map<string, number>();
      if (paperIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('user_id')
          .in('paper_id', paperIds);
        (commentsData || []).forEach((c: any) => {
          commentCountMap.set(c.user_id, (commentCountMap.get(c.user_id) ?? 0) + 1);
        });
      }

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('user_id')
        .eq('status', 'approved')
        .eq('leave_type', 'long_term')
        .lte('start_time', w.end.toISOString())
        .gte('end_time', w.start.toISOString());
      const leaveIds = new Set<string>((leaveData || []).map((l: any) => l.user_id));

      windowData.push({ commentCountMap, uploaderIds, leaveIds, weekStart });
    }

    const _currentWeekStart = windowData[0]?.weekStart ?? getCurrentWeekStart();

    const stats: MemberAttendance[] = activeMembers.map((member) => {
      const completionHistory = windowData.map((w) => {
        const hasCommented = (w.commentCountMap.get(member.id) ?? 0) > 0;
        const onLeave = w.leaveIds.has(member.id);
        return hasCommented || onLeave;   // 上传不算完成
      });

      const total_completed = completionHistory.filter(Boolean).length;

      // 两周连评数 = 本周+上周的评论总数（滚动计算）
      const w0Comments = windowData[0]?.commentCountMap.get(member.id) ?? 0;
      const w1Comments = windowData[1]?.commentCountMap.get(member.id) ?? 0;
      const two_week_comments = w0Comments + w1Comments;

      // Current week status
      const w0 = windowData[0];
      let current_week_status: MemberAttendance['current_week_status'] = 'pending';
      if (w0.leaveIds.has(member.id)) {
        current_week_status = 'on_leave';
      } else if ((w0.commentCountMap.get(member.id) ?? 0) > 0) {
        current_week_status = 'completed';
      }

      return {
        user: member,
        current_week_status,
        two_week_comments,
        total_completed,
      };
    });

    return apiSuccess(stats);
  },

  /**
   * Admin: run 本周任务检测 — deactivate members who failed this week
   * (no approved leave, not uploader, no comment).
   * Returns list of deactivated members.
   */
  async runWeeklyCheck(): Promise<{ data: { data: { deactivated: string[]; notified: string[] } } }> {
    // 取最近两周数据
    const windows = getPastWeekWindows(2);
    const activeMembers = await listActiveProfilesBasic();

    // 每周：评论数Map + 上传者 + 长期请假
    const weekData = await Promise.all(windows.map(async (w) => {
      const { data: papersData } = await supabase
        .from('papers')
        .select('id, uploader_id')
        .gte('created_at', w.start.toISOString())
        .lte('created_at', w.end.toISOString());

      const paperIds = (papersData || []).map((p: any) => p.id);
      const uploaderIds = new Set<string>((papersData || []).map((p: any) => p.uploader_id));

      const commentCountMap = new Map<string, number>();
      if (paperIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments').select('user_id').in('paper_id', paperIds);
        (commentsData || []).forEach((c: any) => {
          commentCountMap.set(c.user_id, (commentCountMap.get(c.user_id) ?? 0) + 1);
        });
      }

      const { data: leaveData } = await supabase
        .from('leave_requests').select('user_id')
        .eq('status', 'approved').eq('leave_type', 'long_term')
        .lte('start_time', w.end.toISOString()).gte('end_time', w.start.toISOString());
      const leaveIds = new Set<string>((leaveData || []).map((l: any) => l.user_id));

      return { commentCountMap, uploaderIds, leaveIds };
    }));

    const w0 = weekData[0]; // 本周
    const w1 = weekData[1]; // 上周

    // 连续两周都未完成（无评论、未长期请假）→ 只发通知提醒，不自动停用
    // 管理员线下沟通后在"成员管理"页手动停用
    const memberCompleted = (w: typeof w0, id: string) =>
      (w.commentCountMap.get(id) ?? 0) > 0 || w.leaveIds.has(id);

    const failed = activeMembers.filter((m) =>
      !memberCompleted(w0, m.id) && !memberCompleted(w1, m.id)
    );

    const deactivated: string[] = [];
    const notified: string[] = [];

    for (const m of failed) {
      try {
        await notificationsApi.send(
          m.id,
          '任务提醒 — 账号即将停用',
          '您已连续两周未完成组会论文评论任务，账号即将被停用，请及时与老师进行沟通。',
          'deactivation'
        );
        notified.push(m.real_name);
      } catch (_) {
        // notification failure is non-fatal
      }
    }

    return apiSuccess({ deactivated, notified });
  },

  /**
   * Admin: toggle comment as 精选
   */
  async toggleFeatured(commentId: number, current: boolean) {
    const { error } = await supabase
      .from('comments')
      .update({ is_featured: !current })
      .eq('id', commentId);

    if (error) throw new Error(error.message || '操作失败');
    return apiSuccess({ is_featured: !current });
  },
};
