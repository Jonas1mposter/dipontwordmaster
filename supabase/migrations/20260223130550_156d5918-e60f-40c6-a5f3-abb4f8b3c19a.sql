
-- Add 'teacher' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- Teacher-class assignment: which teacher manages which classes
CREATE TABLE public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  grade integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_name, grade)
);

ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own class assignments
CREATE POLICY "Teachers can view their own classes"
  ON public.teacher_classes FOR SELECT
  USING (teacher_id = auth.uid());

-- Admins can manage all teacher-class assignments
CREATE POLICY "Admins can manage teacher classes"
  ON public.teacher_classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Class assignments (tasks assigned by teachers)
CREATE TABLE public.class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  grade integer NOT NULL,
  title text NOT NULL,
  description text,
  assignment_type text NOT NULL DEFAULT 'levels', -- 'levels', 'words', 'review'
  target_data jsonb NOT NULL DEFAULT '{}', -- e.g. {"level_ids": [...]} or {"word_count": 50, "unit": 1}
  due_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can CRUD their own assignments
CREATE POLICY "Teachers can manage their own assignments"
  ON public.class_assignments FOR ALL
  USING (teacher_id = auth.uid());

-- Students can view assignments for their class
CREATE POLICY "Students can view their class assignments"
  ON public.class_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.class = class_assignments.class_name
        AND profiles.grade = class_assignments.grade
    )
  );

-- Admins can manage all assignments
CREATE POLICY "Admins can manage all assignments"
  ON public.class_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Class competitions (teacher-organized)
CREATE TABLE public.class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  grade integer NOT NULL,
  title text NOT NULL,
  description text,
  competition_type text NOT NULL DEFAULT 'xp', -- 'xp', 'accuracy', 'words', 'battles'
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own competitions"
  ON public.class_competitions FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their class competitions"
  ON public.class_competitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.class = class_competitions.class_name
        AND profiles.grade = class_competitions.grade
    )
  );

CREATE POLICY "Admins can manage all competitions"
  ON public.class_competitions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on class_assignments
CREATE TRIGGER update_class_assignments_updated_at
  BEFORE UPDATE ON public.class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
