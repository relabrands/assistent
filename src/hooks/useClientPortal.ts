import { useState, useEffect, useCallback } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
import { Profile } from '@/types/database';
import { Client } from '@/types/content';

interface ClientAccess {
  id: string;
  client_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  client?: Client;
}

interface ClientPortalState {
  user: FirebaseUser | null;
  session: { user: FirebaseUser } | null;
  profile: Profile | null;
  clientAccess: ClientAccess[];
  clients: Client[];
  loading: boolean;
}

export function useClientPortal() {
  const [state, setState] = useState<ClientPortalState>({
    user: null,
    session: null,
    profile: null,
    clientAccess: [],
    clients: [],
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const snap = await getDoc(doc(db, 'profiles', userId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Profile;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const fetchClientAccess = useCallback(async (profileId: string) => {
    try {
      const q = query(collection(db, 'client_access'), where('user_id', '==', profileId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientAccess));
    } catch {
      return [];
    }
  }, []);

  const fetchClients = useCallback(async (clientIds: string[]) => {
    if (clientIds.length === 0) return [];
    try {
      const snap = await getDocs(collection(db, 'clients'));
      const allClients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      return allClients.filter(c => clientIds.includes(c.id));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const profile = await fetchProfile(currentUser.uid);
        if (profile) {
          const clientAccess = await fetchClientAccess(profile.id);
          const clientIds = clientAccess.map(ca => ca.client_id);
          const clients = await fetchClients(clientIds);
          setState({
            user: currentUser,
            session: { user: currentUser },
            profile,
            clientAccess,
            clients,
            loading: false
          });
        } else {
          setState({
            user: currentUser,
            session: { user: currentUser },
            profile: null,
            clientAccess: [],
            clients: [],
            loading: false
          });
        }
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          clientAccess: [],
          clients: [],
          loading: false
        });
      }
    });

    return () => unsubscribe();
  }, [fetchProfile, fetchClientAccess, fetchClients]);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { data: userCredential, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
    hasClientAccess: state.clientAccess.length > 0,
  };
}
