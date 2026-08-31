import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentComment } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export interface ContentCommentWithAuthor extends ContentComment {
  author?: Profile;
}

export function useContentComments(profile: Profile | null, contentId: string | null = null) {
  const [comments, setComments] = useState<ContentCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!profile || !contentId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_comments')
        .select(`
          *,
          author:profiles!content_comments_author_id_fkey(*)
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data || []) as ContentCommentWithAuthor[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Error al cargar comentarios');
    } finally {
      setLoading(false);
    }
  }, [profile, contentId]);

  useEffect(() => {
    fetchComments();

    if (!contentId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel(`content_comments_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_comments',
          filter: `content_id=eq.${contentId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, contentId]);

  const addComment = useCallback(async (commentData: {
    content_id: string;
    comment: string;
    is_approval_request?: boolean;
    is_change_request?: boolean;
  }) => {
    if (!profile) return null;

    try {
      const { data, error } = await supabase
        .from('content_comments')
        .insert({
          ...commentData,
          author_id: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data as ContentComment;
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Error al crear comentario');
      return null;
    }
  }, [profile]);

  const deleteComment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Comentario eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error al eliminar comentario');
      return false;
    }
  }, []);

  return {
    comments,
    loading,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}
