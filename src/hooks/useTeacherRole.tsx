import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTeacherRole() {
  const { user } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTeacherRole() {
      if (!user) {
        setIsTeacher(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['teacher', 'admin']);

        if (error) {
          console.error('Error checking teacher role:', error);
          setIsTeacher(false);
        } else {
          setIsTeacher(!!data && data.length > 0);
        }
      } catch (err) {
        console.error('Error:', err);
        setIsTeacher(false);
      } finally {
        setLoading(false);
      }
    }

    checkTeacherRole();
  }, [user]);

  return { isTeacher, loading };
}
