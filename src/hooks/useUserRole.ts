import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/database';

type FullAppRole = AppRole | 'client';

interface UserRoleInfo {
  role: FullAppRole | null;
  isAdmin: boolean;
  isCollaborator: boolean;
  isClient: boolean;
  loading: boolean;
}

export function useUserRole(profile: Profile | null, workspaceId: string | null): UserRoleInfo {
  const [role, setRole] = useState<FullAppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!profile || !workspaceId) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // First check user_roles table
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        setRole(null);
      } else if (userRole) {
        setRole(userRole.role as FullAppRole);
      } else {
        // Check if user has client access
        const { data: clientAccess, error: clientError } = await supabase
          .from('client_access')
          .select('id')
          .eq('user_id', profile.id)
          .limit(1);

        if (clientError) {
          console.error('Error fetching client access:', clientError);
          setRole(null);
        } else if (clientAccess && clientAccess.length > 0) {
          setRole('client');
        } else {
          setRole(null);
        }
      }
    } catch (error) {
      console.error('Error in fetchRole:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [profile, workspaceId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    isAdmin: role === 'admin',
    isCollaborator: role === 'collaborator',
    isClient: role === 'client',
    loading,
  };
}
