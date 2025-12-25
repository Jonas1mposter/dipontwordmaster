-- Create reports table for user content reporting
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'user', 'message', 'chat'
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Users can submit reports"
ON public.reports
FOR INSERT
WITH CHECK (reporter_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can view their own submitted reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
USING (reporter_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can block other users
CREATE POLICY "Users can block other users"
ON public.blocked_users
FOR INSERT
WITH CHECK (blocker_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can view their blocked list
CREATE POLICY "Users can view their blocked users"
ON public.blocked_users
FOR SELECT
USING (blocker_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can unblock users
CREATE POLICY "Users can unblock users"
ON public.blocked_users
FOR DELETE
USING (blocker_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));