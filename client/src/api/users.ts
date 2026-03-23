import { apiSuccess } from '../lib/api';
import { getCurrentProfile, listPapersRaw, listProfiles, mapPaper } from '../lib/database';
import { supabase } from '../lib/supabase';

export const usersApi = {
  async list() {
    return apiSuccess(await listProfiles());
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
      throw new Error(error.message || '获取成员信息失败');
    }

    return apiSuccess(data);
  },

  async update(id: string, data: any) {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || '更新资料失败');
    }

    return apiSuccess(updated);
  },

  async updateRole(id: string, role: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || '更新角色失败');
    }

    return apiSuccess(data);
  },

  async updateStatus(id: string, is_active: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || '更新状态失败');
    }

    return apiSuccess(data);
  },
};

export const statsApi = {
  async overview() {
    const currentUser = await getCurrentProfile();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    const [members, papersData, commentRows] = await Promise.all([
      listProfiles(),
      listPapersRaw({ page: 1, limit: 1000, sort: 'created_at', order: 'desc' }),
      supabase.from('comments').select('paper_id, user_id'),
    ]);

    if (commentRows.error) {
      throw new Error(commentRows.error.message || '获取统计失败');
    }

    const papers = papersData.rows.map(mapPaper);
    const myComments = (commentRows.data || []).filter((row) => row.user_id === currentUser.id);
    const pendingCount = papers.filter((paper) => {
      if (paper.uploader_id === currentUser.id) {
        return false;
      }
      return !myComments.some((comment) => comment.paper_id === paper.id);
    }).length;

    return apiSuccess({
      total_papers: papers.length,
      my_comments: myComments.length,
      pending_count: pendingCount,
      total_members: members.filter((member) => member.is_active).length,
    });
  },

  async participation() {
    const [members, papersData, commentsRes] = await Promise.all([
      listProfiles(),
      listPapersRaw({ page: 1, limit: 1000, sort: 'created_at', order: 'desc' }),
      supabase.from('comments').select('paper_id, user_id'),
    ]);

    if (commentsRes.error) {
      throw new Error(commentsRes.error.message || '获取参与统计失败');
    }

    const papers = papersData.rows.map(mapPaper);
    const comments = commentsRes.data || [];
    const activeMembers = members.filter((member) => member.is_active);

    const matrix = activeMembers.map((member) => ({
      user: member,
      papers: papers.map((paper) => ({
        paper_id: paper.id,
        is_uploader: paper.uploader_id === member.id,
        has_commented: comments.some(
          (comment) => comment.paper_id === paper.id && comment.user_id === member.id
        ),
      })),
    }));

    return apiSuccess({
      papers,
      matrix,
    });
  },

  async userStats(id: string) {
    const [userRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('comments').select('paper_id, user_id').eq('user_id', id),
    ]);

    if (userRes.error || commentsRes.error) {
      throw new Error(userRes.error?.message || commentsRes.error?.message || '获取用户统计失败');
    }

    return apiSuccess({
      user: userRes.data,
      comments: commentsRes.data || [],
    });
  },
};
