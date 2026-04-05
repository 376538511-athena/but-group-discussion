export type NotificationType = 'general' | 'leave_request' | 'approval' | 'deactivation';

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  type: NotificationType;
  leave_request_id: number | null;
  created_at: string;
}
