import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Profile, AppRole, WorkspaceInvitation, Workspace } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface InviteData {
  invitation: WorkspaceInvitation;
  workspace: Workspace;
}

export function useInviteHandler(profile: Profile | null) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingInvite, setPendingInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkInvitation = useCallback(async (token: string) => {
    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'workspace_invitations'),
        where('token', '==', token),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast({
          title: 'Invitación no válida',
          description: 'La invitación no existe, ya fue usada o expiró',
          variant: 'destructive',
        });
        clearInviteParam();
        setLoading(false);
        return;
      }

      const invDoc = snap.docs[0];
      const invitationData = { id: invDoc.id, ...invDoc.data() } as WorkspaceInvitation;

      // Get workspace details
      const wsDoc = await getDoc(doc(db, 'workspaces', invitationData.workspace_id));
      const workspaceData = wsDoc.exists() 
        ? ({ id: wsDoc.id, ...wsDoc.data() } as Workspace)
        : ({ id: invitationData.workspace_id, name: 'Workspace' } as Workspace);

      setPendingInvite({
        invitation: invitationData,
        workspace: workspaceData,
      });
    } catch (error) {
      console.error('Error checking invitation:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken && profile) {
      checkInvitation(inviteToken);
    }
  }, [searchParams, profile, checkInvitation]);

  const clearInviteParam = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('invite');
    setSearchParams(newParams, { replace: true });
  };

  const acceptInvitation = useCallback(async () => {
    if (!pendingInvite || !profile) return false;

    setLoading(true);

    try {
      await addDoc(collection(db, 'user_roles'), {
        user_id: profile.id,
        workspace_id: pendingInvite.workspace.id,
        role: (pendingInvite.invitation.role as AppRole) || 'collaborator',
        created_at: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'workspace_invitations', pendingInvite.invitation.id), {
        status: 'accepted',
        updated_at: new Date().toISOString(),
      });

      clearInviteParam();
      setPendingInvite(null);

      toast({
        title: '¡Bienvenido!',
        description: `Te uniste a ${pendingInvite.workspace.name}`,
      });

      window.location.href = '/';
      return true;
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
      setLoading(false);
      return false;
    }
  }, [pendingInvite, profile, toast]);

  const declineInvitation = useCallback(() => {
    clearInviteParam();
    setPendingInvite(null);
  }, []);

  return {
    pendingInvite,
    loading,
    acceptInvitation,
    declineInvitation,
  };
}
