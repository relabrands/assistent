import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export type ClientAccessRole = 'viewer' | 'approver';

export interface ClientAccessRecord {
  id: string;
  client_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  role: ClientAccessRole;
  user_profile?: Profile;
  granter_profile?: Profile;
}

export function useClientAccess(clientId: string | null) {
  const [accessRecords, setAccessRecords] = useState<ClientAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    if (!clientId) {
      setAccessRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch access records for this client
      const { data: accessData, error: accessError } = await supabase
        .from('client_access')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (accessError) throw accessError;

      if (!accessData || accessData.length === 0) {
        setAccessRecords([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and granter IDs
      const userIds = [...new Set(accessData.map(a => a.user_id))];
      const granterIds = [...new Set(accessData.map(a => a.granted_by))];
      const allProfileIds = [...new Set([...userIds, ...granterIds])];

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allProfileIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Combine data
      const records: ClientAccessRecord[] = accessData.map(access => ({
        ...access,
        role: (access.role as ClientAccessRole) || 'viewer',
        user_profile: profileMap.get(access.user_id),
        granter_profile: profileMap.get(access.granted_by),
      }));

      setAccessRecords(records);
    } catch (error) {
      console.error('Error fetching client access:', error);
      toast.error('Error al cargar accesos del cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAccess();

    if (!clientId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel(`client_access_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_access',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAccess, clientId]);

  const revokeAccess = useCallback(async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('client_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success('Acceso revocado correctamente');
      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Error al revocar acceso');
      return false;
    }
  }, []);

  const updateRole = useCallback(async (accessId: string, newRole: ClientAccessRole) => {
    try {
      const { error } = await supabase
        .from('client_access')
        .update({ role: newRole })
        .eq('id', accessId);

      if (error) throw error;

      toast.success(`Rol actualizado a ${newRole === 'approver' ? 'Aprobador' : 'Solo lectura'}`);
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar el rol');
      return false;
    }
  }, []);

  return {
    accessRecords,
    loading,
    revokeAccess,
    updateRole,
    refetch: fetchAccess,
  };
}
