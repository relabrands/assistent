import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { ContentComment } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export interface ContentCommentWithAuthor extends ContentComment {
  author?: Profile;
}

export function useContentComments(profile: Profile | null, contentId: string | null = null) {
  const [comments, setComments] = useState<ContentCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !contentId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const commentsQuery = query(
      collection(db, 'content_comments'),
      where('content_id', '==', contentId)
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentCommentWithAuthor));
      items.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      setComments(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching comments from Firestore:', error);
      toast.error('Error al cargar comentarios');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, contentId]);

  const addComment = useCallback(async (commentData: {
    content_id: string;
    comment: string;
    is_approval_request?: boolean;
    is_change_request?: boolean;
  }) => {
    if (!profile) return null;

    try {
      const newComment = {
        ...commentData,
        author_id: profile.id,
        created_at: new Date().toISOString(),
        author: profile,
      };

      const docRef = await addDoc(collection(db, 'content_comments'), newComment);
      return { id: docRef.id, ...newComment } as ContentComment;
    } catch (error) {
      console.error('Error creating comment in Firestore:', error);
      toast.error('Error al crear comentario');
      return null;
    }
  }, [profile]);

  const deleteComment = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'content_comments', id));
      toast.success('Comentario eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting comment in Firestore:', error);
      toast.error('Error al eliminar comentario');
      return false;
    }
  }, []);

  return {
    comments,
    loading,
    addComment,
    deleteComment,
    refetch: () => {},
  };
}
