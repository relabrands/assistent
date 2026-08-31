import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { ContentItem, ContentStatus, ContentType, PlatformType } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export function useContentItems(profile: Profile | null, clientId: string | null = null) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setContentItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let contentQuery;
    if (clientId) {
      contentQuery = query(collection(db, 'content_items'), where('client_id', '==', clientId));
    } else {
      contentQuery = query(collection(db, 'content_items'));
    }

    const unsubscribe = onSnapshot(contentQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      items.sort((a, b) => {
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });
      setContentItems(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching content items in Firestore:', error);
      toast.error('Error al cargar contenidos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, clientId]);

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
      const newItem = {
        ...contentData,
        scheduled_date: contentData.scheduled_date?.toISOString() || null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'content_items'), newItem);
      toast.success('Contenido creado correctamente');
      return { id: docRef.id, ...newItem } as ContentItem;
    } catch (error) {
      console.error('Error creating content in Firestore:', error);
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
      const updateData: Record<string, unknown> = { ...contentData, updated_at: new Date().toISOString() };
      
      if (contentData.scheduled_date !== undefined) {
        updateData.scheduled_date = contentData.scheduled_date?.toISOString() || null;
      }
      if (contentData.published_date !== undefined) {
        updateData.published_date = contentData.published_date?.toISOString() || null;
      }
      if (contentData.approved_at !== undefined) {
        updateData.approved_at = contentData.approved_at?.toISOString() || null;
      }

      await updateDoc(doc(db, 'content_items', id), updateData);
      toast.success('Contenido actualizado');
      return true;
    } catch (error) {
      console.error('Error updating content in Firestore:', error);
      toast.error('Error al actualizar contenido');
      return false;
    }
  }, []);

  const deleteContentItem = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'content_items', id));
      toast.success('Contenido eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting content in Firestore:', error);
      toast.error('Error al eliminar contenido');
      return false;
    }
  }, []);

  const approveContent = useCallback(async (id: string) => {
    if (!profile) return false;

    try {
      await updateDoc(doc(db, 'content_items', id), {
        status: 'approved' as ContentStatus,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success('Contenido aprobado');
      return true;
    } catch (error) {
      console.error('Error approving content in Firestore:', error);
      toast.error('Error al aprobar contenido');
      return false;
    }
  }, [profile]);

  const requestChanges = useCallback(async (id: string, comment?: string) => {
    if (!profile) return false;
    
    try {
      await updateDoc(doc(db, 'content_items', id), {
        status: 'requires_changes' as ContentStatus,
        updated_at: new Date().toISOString(),
      });

      if (comment) {
        await addDoc(collection(db, 'content_comments'), {
          content_id: id,
          author_id: profile.id,
          comment,
          is_change_request: true,
          created_at: new Date().toISOString(),
        });
      }

      toast.success('Cambios solicitados');
      return true;
    } catch (error) {
      console.error('Error requesting changes in Firestore:', error);
      toast.error('Error al solicitar cambios');
      return false;
    }
  }, [profile]);

  return {
    contentItems,
    loading,
    addContentItem,
    updateContentItem,
    deleteContentItem,
    approveContent,
    requestChanges,
    refetch: () => {},
  };
}
