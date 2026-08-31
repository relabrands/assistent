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
import { Client } from '@/types/content';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

export function useClients(profile: Profile | null, projectId: string | null = null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let clientsQuery;
    if (projectId) {
      clientsQuery = query(collection(db, 'clients'), where('project_id', '==', projectId));
    } else {
      clientsQuery = query(collection(db, 'clients'));
    }

    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching clients from Firestore:', error);
      toast.error('Error al cargar clientes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, projectId]);

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
      const newClient = {
        ...clientData,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'clients'), newClient);
      toast.success('Cliente creado correctamente');
      return { id: docRef.id, ...newClient } as Client;
    } catch (error) {
      console.error('Error creating client in Firestore:', error);
      toast.error('Error al crear cliente');
      return null;
    }
  }, [profile]);

  const updateClient = useCallback(async (id: string, clientData: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
    try {
      await updateDoc(doc(db, 'clients', id), {
        ...clientData,
        updated_at: new Date().toISOString(),
      });
      toast.success('Cliente actualizado');
      return true;
    } catch (error) {
      console.error('Error updating client in Firestore:', error);
      toast.error('Error al actualizar cliente');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
      toast.success('Cliente eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting client in Firestore:', error);
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
    refetch: () => {},
  };
}
