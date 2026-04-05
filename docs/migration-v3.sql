-- =============================================================
-- Migration v3: college字段 / 请假时间范围 / 通知分类
-- Run in Supabase SQL Editor AFTER migration-v2.sql
-- =============================================================

-- 1. 学院专业字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college text;

-- 2. leave_requests 改版：请假时间范围 + 类型
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time   timestamptz,
  ADD COLUMN IF NOT EXISTS leave_type text NOT NULL DEFAULT 'short_term'
    CHECK (leave_type IN ('short_term', 'long_term'));

-- week_start 允许为空（长期请假不依赖单周）
ALTER TABLE public.leave_requests
  ALTER COLUMN week_start DROP NOT NULL;

-- 3. notifications 增加消息分类 + 关联请假ID
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general'
    CHECK (type IN ('general', 'leave_request', 'approval', 'deactivation')),
  ADD COLUMN IF NOT EXISTS leave_request_id bigint REFERENCES public.leave_requests(id)
    ON DELETE SET NULL;

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;
