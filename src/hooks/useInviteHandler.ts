import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

  // Check for invite token in URL
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken && profile) {
      checkInvitation(inviteToken);
    }
  }, [searchParams, profile]);

  const checkInvitation = async (token: string) => {
    setLoading(true);
    
    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !invitation) {
      toast({
        title: 'Invitación no válida',
        description: 'La invitación no existe, ya fue usada o expiró',
        variant: 'destructive',
      });
      clearInviteParam();
      setLoading(false);
      return;
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      toast({
        title: 'Invitación expirada',
        description: 'Esta invitación ha expirado',
        variant: 'destructive',
      });
      clearInviteParam();
      setLoading(false);
      return;
    }

    // Check if email matches (optional - can be removed if invites should be open)
    if (profile && invitation.email !== profile.email) {
      toast({
        title: 'Email no coincide',
        description: 'Esta invitación fue enviada a otro email',
        variant: 'destructive',
      });
      clearInviteParam();
      setLoading(false);
      return;
    }

    setPendingInvite({
      invitation: invitation as unknown as WorkspaceInvitation,
      workspace: invitation.workspace as unknown as Workspace,
    });
    setLoading(false);
  };

  const acceptInvitation = useCallback(async () => {
    if (!pendingInvite || !profile) return false;

    setLoading(true);

    try {
      // Check if already member
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('workspace_id', pendingInvite.workspace.id)
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Ya eres miembro',
          description: 'Ya perteneces a este workspace',
        });
        await markInvitationUsed();
        return true;
      }

      // Add user to workspace
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          workspace_id: pendingInvite.workspace.id,
          role: pendingInvite.invitation.role as AppRole,
        });

      if (roleError) {
        console.error('Error adding user to workspace:', roleError);
        toast({
          title: 'Error',
          description: 'No se pudo unir al workspace',
          variant: 'destructive',
        });
        setLoading(false);
        return false;
      }

      await markInvitationUsed();

      toast({
        title: '¡Bienvenido!',
        description: `Te uniste a ${pendingInvite.workspace.name}`,
      });

      // Reload to refresh workspace list
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

  const markInvitationUsed = async () => {
    if (!pendingInvite) return;

    await supabase
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', pendingInvite.invitation.id);

    clearInviteParam();
    setPendingInvite(null);
    setLoading(false);
  };

  const declineInvitation = useCallback(() => {
    clearInviteParam();
    setPendingInvite(null);
  }, []);

  const clearInviteParam = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('invite');
    setSearchParams(newParams, { replace: true });
  };

  return {
    pendingInvite,
    loading,
    acceptInvitation,
    declineInvitation,
  };
}
