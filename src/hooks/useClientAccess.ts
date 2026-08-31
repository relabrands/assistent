import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
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

  useEffect(() => {
    if (!clientId) {
      setAccessRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'client_access'),
      where('client_id', '==', clientId)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const recordsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientAccessRecord));
      
      try {
        const profSnap = await getDocs(collection(db, 'profiles'));
        const profileMap = new Map(profSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Profile]));

        const combined = recordsData.map(r => ({
          ...r,
          user_profile: profileMap.get(r.user_id),
          granter_profile: profileMap.get(r.granted_by),
        }));

        setAccessRecords(combined);
      } catch {
        setAccessRecords(recordsData);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching client access:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  const revokeAccess = useCallback(async (accessId: string) => {
    try {
      await deleteDoc(doc(db, 'client_access', accessId));
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
      await updateDoc(doc(db, 'client_access', accessId), {
        role: newRole,
        updated_at: new Date().toISOString(),
      });
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
    refetch: () => {},
  };
}
