import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
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
      const q = query(
        collection(db, 'user_roles'),
        where('user_id', '==', profile.id),
        where('workspace_id', '==', workspaceId)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0].data();
        setRole(data.role as FullAppRole);
      } else {
        // Fallback: If user is owner of the workspace
        const wsQuery = query(collection(db, 'workspaces'), where('owner_id', '==', profile.id));
        const wsSnap = await getDocs(wsQuery);
        if (!wsSnap.empty && wsSnap.docs.some(d => d.id === workspaceId)) {
          setRole('admin');
        } else {
          setRole('admin'); // Default to admin for personal workspace
        }
      }
    } catch (error) {
      console.error('Error in fetchRole in Firestore:', error);
      setRole('admin');
    } finally {
      setLoading(false);
    }
  }, [profile, workspaceId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role: role || 'admin',
    isAdmin: role === 'admin' || !role,
    isCollaborator: role === 'collaborator',
    isClient: role === 'client',
    loading,
  };
}
