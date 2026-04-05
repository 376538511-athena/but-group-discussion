import type { LeaveRequest } from '../types/leaveRequest';
import { apiSuccess } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getCurrentProfile } from '../lib/database';

/** Get all admin user IDs */
async function getAdminIds(): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);
  return (data || []).map((r: any) => r.id);
}

export const leaveRequestsApi = {
  /** Current user's own leave requests */
  async listMine(): Promise<{ data: { data: LeaveRequest[] } }> {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || '获取请假记录失败');
    return apiSuccess((data || []) as LeaveRequest[]);
  },

  /** Admin: list all leave requests with user info */
  async listAll(): Promise<{ data: { data: (LeaveRequest & { user: { real_name: string; username: string } })[] } }> {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, user:profiles!leave_requests_user_id_fkey(real_name, username)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || '获取请假列表失败');
    return apiSuccess((data || []) as any);
  },

  /**
   * Submit a leave request.
   * After creation, sends a 'leave_request' notification to all admins.
   */
  async create(params: {
    start_time: string;   // ISO datetime
    end_time: string;     // ISO datetime
    leave_type: 'short_term' | 'long_term';
    reason: string;
  }) {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: user.id,
        start_time: params.start_time,
        end_time: params.end_time,
        leave_type: params.leave_type,
        reason: params.reason,
      })
      .select()
      .single();

    if (error) throw new Error(error.message || '提交请假失败');
    const req = data as LeaveRequest;

    // Notify all admins
    const adminIds = await getAdminIds();
    const leaveTypeLabel = params.leave_type === 'long_term' ? '长期假' : '短期假';
    for (const adminId of adminIds) {
      await supabase.from('notifications').insert({
        user_id: adminId,
        title: `请假申请：${user.real_name}`,
        content: `${user.real_name} 申请${leaveTypeLabel}（${params.start_time.slice(0, 10)} ~ ${params.end_time.slice(0, 10)}），原因：${params.reason}`,
        type: 'leave_request',
        leave_request_id: req.id,
      });
    }

    return apiSuccess(req);
  },

  /**
   * Admin: approve or reject a leave request.
   * Notifies the applicant of the result.
   */
  async review(id: number, status: 'approved' | 'rejected', adminNote?: string) {
    const admin = await getCurrentProfile();
    if (!admin) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status, admin_id: admin.id, admin_note: adminNote || null })
      .eq('id', id)
      .select('*, user:profiles!leave_requests_user_id_fkey(id, real_name)')
      .single();

    if (error) throw new Error(error.message || '审批失败');
    const req = data as any;

    // Notify applicant
    const resultLabel = status === 'approved' ? '已通过' : '已驳回';
    await supabase.from('notifications').insert({
      user_id: req.user.id,
      title: `请假申请${resultLabel}`,
      content: status === 'approved'
        ? `您的请假申请已通过${adminNote ? `，备注：${adminNote}` : ''}。`
        : `您的请假申请被驳回${adminNote ? `，原因：${adminNote}` : ''}。`,
      type: 'approval',
      leave_request_id: id,
    });

    return apiSuccess(req as LeaveRequest);
  },

  /** Delete own pending request (撤销) */
  async deleteOwn(id: number) {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message || '撤销失败');
    return apiSuccess(null);
  },

  /**
   * Check if a member has an approved long-term leave overlapping a given window.
   * Short-term leave does NOT exempt from weekly task.
   */
  async hasLongTermLeave(userId: string, windowStart: string, windowEnd: string): Promise<boolean> {
    const { data } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('leave_type', 'long_term')
      .lte('start_time', windowEnd)
      .gte('end_time', windowStart)
      .limit(1)
      .maybeSingle();

    return !!data;
  },
};
