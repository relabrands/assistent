import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentItem, ContentStatus, ContentType, PlatformType } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export function useContentItems(profile: Profile | null, clientId: string | null = null) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContentItems = useCallback(async () => {
    if (!profile) {
      setContentItems([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('content_items')
        .select('*')
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContentItems((data || []) as ContentItem[]);
    } catch (error) {
      console.error('Error fetching content items:', error);
      toast.error('Error al cargar contenidos');
    } finally {
      setLoading(false);
    }
  }, [profile, clientId]);

  useEffect(() => {
    fetchContentItems();

    // Set up realtime subscription
    const channel = supabase
      .channel('content_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_items',
        },
        () => {
          fetchContentItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContentItems]);

  const addContentItem = useCallback(async (contentData: {
    client_id: string;
    project_id: string;
    title: string;
    content_type?: ContentType;
    platform?: PlatformType;
    status?: ContentStatus;
    scheduled_date?: Date | null;
    copy?: string | null;
    hashtags?: string[] | null;
    cta?: string | null;
    link?: string | null;
    reference_urls?: string[] | null;
    file_urls?: string[] | null;
    thumbnail_url?: string | null;
    assigned_to?: string | null;
  }) => {
    if (!profile) return null;

    try {
      const { data, error } = await supabase
        .from('content_items')
        .insert({
          ...contentData,
          scheduled_date: contentData.scheduled_date?.toISOString() || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Contenido creado correctamente');
      return data as ContentItem;
    } catch (error) {
      console.error('Error creating content:', error);
      toast.error('Error al crear contenido');
      return null;
    }
  }, [profile]);

  const updateContentItem = useCallback(async (id: string, contentData: Partial<{
    title: string;
    content_type: ContentType;
    platform: PlatformType;
    status: ContentStatus;
    scheduled_date: Date | null;
    published_date: Date | null;
    copy: string | null;
    hashtags: string[] | null;
    cta: string | null;
    link: string | null;
    reference_urls: string[] | null;
    file_urls: string[] | null;
    thumbnail_url: string | null;
    assigned_to: string | null;
    approved_by: string | null;
    approved_at: Date | null;
  }>) => {
    try {
      const updateData: Record<string, unknown> = { ...contentData };
      
      if (contentData.scheduled_date !== undefined) {
        updateData.scheduled_date = contentData.scheduled_date?.toISOString() || null;
      }
      if (contentData.published_date !== undefined) {
        updateData.published_date = contentData.published_date?.toISOString() || null;
      }
      if (contentData.approved_at !== undefined) {
        updateData.approved_at = contentData.approved_at?.toISOString() || null;
      }

      const { error } = await supabase
        .from('content_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Contenido actualizado');
      return true;
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Error al actualizar contenido');
      return false;
    }
  }, []);

  const deleteContentItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Contenido eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Error al eliminar contenido');
      return false;
    }
  }, []);

  // Approval functions with email notifications
  const approveContent = useCallback(async (id: string, clientName?: string) => {
    if (!profile) return false;

    try {
      // Get content details first
      const content = contentItems.find(c => c.id === id);
      
      const { error } = await supabase
        .from('content_items')
        .update({
          status: 'approved' as ContentStatus,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Send email notification
      if (content) {
        try {
          await supabase.functions.invoke('send-content-notification', {
            body: {
              contentId: id,
              action: 'approved',
              clientName: clientName || profile.display_name,
              contentTitle: content.title,
            },
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
        }
      }

      toast.success('Contenido aprobado');
      return true;
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Error al aprobar contenido');
      return false;
    }
  }, [profile, contentItems]);

  const requestChanges = useCallback(async (id: string, comment?: string, clientName?: string) => {
    if (!profile) return false;
    
    try {
      // Get content details first
      const content = contentItems.find(c => c.id === id);
      
      const { error } = await supabase
        .from('content_items')
        .update({
          status: 'requires_changes' as ContentStatus,
        })
        .eq('id', id);

      if (error) throw error;

      // Add comment if provided
      if (comment) {
        await supabase
          .from('content_comments')
          .insert({
            content_id: id,
            author_id: profile.id,
            comment,
            is_change_request: true,
          });
      }

      // Send email notification
      if (content) {
        try {
          await supabase.functions.invoke('send-content-notification', {
            body: {
              contentId: id,
              action: 'changes_requested',
              clientName: clientName || profile.display_name,
              contentTitle: content.title,
              comment,
            },
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
        }
      }

      toast.success('Cambios solicitados');
      return true;
    } catch (error) {
      console.error('Error requesting changes:', error);
      toast.error('Error al solicitar cambios');
      return false;
    }
  }, [profile, contentItems]);

  return {
    contentItems,
    loading,
    addContentItem,
    updateContentItem,
    deleteContentItem,
    approveContent,
    requestChanges,
    refetch: fetchContentItems,
  };
}
