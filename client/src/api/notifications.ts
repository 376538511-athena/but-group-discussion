import type { Notification } from '../types/notification';
import { apiSuccess } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getCurrentProfile } from '../lib/database';

export const notificationsApi = {
  async list(): Promise<{ data: { data: Notification[] } }> {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message || '获取通知失败');
    return apiSuccess((data || []) as Notification[]);
  },

  async unreadCount(): Promise<number> {
    const user = await getCurrentProfile();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  async markRead(id: number) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw new Error(error.message || '标记已读失败');
    return apiSuccess(null);
  },

  async markAllRead() {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw new Error(error.message || '标记已读失败');
    return apiSuccess(null);
  },

  /** Admin sends a notification to a specific user */
  async send(targetUserId: string, title: string, content: string, type: Notification['type'] = 'general', leaveRequestId?: number) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title,
        content,
        type,
        leave_request_id: leaveRequestId ?? null,
      });

    if (error) throw new Error(error.message || '发送通知失败');
    return apiSuccess(null);
  },
};
