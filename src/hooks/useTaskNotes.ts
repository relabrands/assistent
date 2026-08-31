import { useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { TaskNote, Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useTaskNotes(profile: Profile | null) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchNotes = useCallback(async (taskId: string): Promise<TaskNote[]> => {
    try {
      const q = query(
        collection(db, 'task_notes'),
        where('task_id', '==', taskId)
      );
      const snap = await getDocs(q);
      const notes = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskNote));
      notes.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      return notes;
    } catch (error) {
      console.error('Error fetching notes in Firestore:', error);
      return [];
    }
  }, []);

  const addNote = useCallback(async (taskId: string, content: string) => {
    if (!profile) return null;
    
    setLoading(true);
    try {
      const newNote = {
        task_id: taskId,
        content,
        created_by: profile.id,
        creator: profile,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'task_notes'), newNote);
      setLoading(false);
      return { id: docRef.id, ...newNote } as TaskNote;
    } catch (error) {
      setLoading(false);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la nota',
        variant: 'destructive',
      });
      return null;
    }
  }, [profile, toast]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'task_notes', noteId));
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la nota',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    loading,
    fetchNotes,
    addNote,
    deleteNote,
  };
}
