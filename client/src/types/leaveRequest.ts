export interface LeaveRequest {
  id: number;
  user_id: string;
  week_start: string | null;        // legacy, may be null for new records
  start_time: string | null;        // ISO datetime string
  end_time: string | null;          // ISO datetime string
  leave_type: 'short_term' | 'long_term';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}
