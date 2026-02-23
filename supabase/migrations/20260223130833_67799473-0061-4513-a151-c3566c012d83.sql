
-- Allow teachers to delete their own assignments
CREATE POLICY "Teachers can delete their own assignments"
  ON public.class_assignments FOR DELETE
  USING (teacher_id = auth.uid());

-- Allow teachers to delete their own competitions
CREATE POLICY "Teachers can delete their own competitions"
  ON public.class_competitions FOR DELETE
  USING (teacher_id = auth.uid());

-- Admins can delete all assignments
CREATE POLICY "Admins can delete all assignments"
  ON public.class_assignments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete all competitions  
CREATE POLICY "Admins can delete all competitions"
  ON public.class_competitions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
