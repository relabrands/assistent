import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { Client, ContentItem } from '@/types/content';

interface ClientAccess {
  id: string;
  client_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  client?: Client;
}

interface ClientPortalState {
  user: User | null;
  session: Session | null;
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data as Profile | null;
  }, []);

  const fetchClientAccess = useCallback(async (profileId: string) => {
    const { data } = await supabase
      .from('client_access')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('user_id', profileId);
    
    return data as unknown as ClientAccess[];
  }, []);

  const fetchClients = useCallback(async (clientIds: string[]) => {
    if (clientIds.length === 0) return [];
    
    const { data } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);
    
    return data as Client[];
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;

        if (user) {
          setTimeout(async () => {
            const profile = await fetchProfile(user.id);
            if (profile) {
              const clientAccess = await fetchClientAccess(profile.id);
              const clientIds = clientAccess.map(ca => ca.client_id);
              const clients = await fetchClients(clientIds);
              setState({ user, session, profile, clientAccess, clients, loading: false });
            } else {
              setState({ user, session, profile: null, clientAccess: [], clients: [], loading: false });
            }
          }, 0);
        } else {
          setState({ user: null, session: null, profile: null, clientAccess: [], clients: [], loading: false });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;

      if (user) {
        const profile = await fetchProfile(user.id);
        if (profile) {
          const clientAccess = await fetchClientAccess(profile.id);
          const clientIds = clientAccess.map(ca => ca.client_id);
          const clients = await fetchClients(clientIds);
          setState({ user, session, profile, clientAccess, clients, loading: false });
        } else {
          setState({ user, session, profile: null, clientAccess: [], clients: [], loading: false });
        }
      } else {
        setState({ user: null, session: null, profile: null, clientAccess: [], clients: [], loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchClientAccess, fetchClients]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
    hasClientAccess: state.clientAccess.length > 0,
  };
}
