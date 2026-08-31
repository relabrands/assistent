import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskNote, Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useTaskNotes(profile: Profile | null) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchNotes = useCallback(async (taskId: string): Promise<TaskNote[]> => {
    const { data, error } = await supabase
      .from('task_notes')
      .select('*, creator:profiles!task_notes_created_by_fkey(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return data as TaskNote[];
  }, []);

  const addNote = useCallback(async (taskId: string, content: string) => {
    if (!profile) return null;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('task_notes')
      .insert({
        task_id: taskId,
        content,
        created_by: profile.id,
      })
      .select('*, creator:profiles!task_notes_created_by_fkey(*)')
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar la nota',
        variant: 'destructive',
      });
      return null;
    }

    return data as TaskNote;
  }, [profile, toast]);

  const deleteNote = useCallback(async (noteId: string) => {
    const { error } = await supabase
      .from('task_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la nota',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [toast]);

  return {
    loading,
    fetchNotes,
    addNote,
    deleteNote,
  };
}
