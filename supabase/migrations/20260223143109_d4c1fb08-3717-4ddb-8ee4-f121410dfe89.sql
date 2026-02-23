
-- Allow teachers to view learning_progress for students in their assigned classes
CREATE POLICY "Teachers can view student learning progress"
ON public.learning_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN teacher_classes tc ON tc.grade = p.grade AND tc.class_name = p.class
    WHERE p.id = learning_progress.profile_id
      AND tc.teacher_id = auth.uid()
  )
);

-- Allow teachers to view level_progress for students in their assigned classes
CREATE POLICY "Teachers can view student level progress"
ON public.level_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN teacher_classes tc ON tc.grade = p.grade AND tc.class_name = p.class
    WHERE p.id = level_progress.profile_id
      AND tc.teacher_id = auth.uid()
  )
);
