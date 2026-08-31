import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export function useClients(profile: Profile | null, projectId: string | null = null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!profile) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('name');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [profile, projectId]);

  useEffect(() => {
    fetchClients();

    // Set up realtime subscription
    const channel = supabase
      .channel('clients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  const addClient = useCallback(async (clientData: {
    project_id: string;
    name: string;
    brand_name?: string | null;
    logo_url?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    website?: string | null;
    social_instagram?: string | null;
    social_facebook?: string | null;
    social_tiktok?: string | null;
    social_linkedin?: string | null;
    social_youtube?: string | null;
    notes?: string | null;
  }) => {
    if (!profile) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente creado correctamente');
      return data as Client;
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Error al crear cliente');
      return null;
    }
  }, [profile]);

  const updateClient = useCallback(async (id: string, clientData: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Cliente actualizado');
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Error al actualizar cliente');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Cliente eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar cliente');
      return false;
    }
  }, []);

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  };
}
