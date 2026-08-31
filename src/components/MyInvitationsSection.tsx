import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, WorkspaceInvitation, Workspace, ROLE_LABELS } from '@/types/database';
import { Mail, Check, X, Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MyInvitationsSectionProps {
  profile: Profile | null;
}

interface InvitationWithWorkspace extends WorkspaceInvitation {
  workspace?: Workspace;
}

export function MyInvitationsSection({ profile }: MyInvitationsSectionProps) {
  const [invitations, setInvitations] = useState<InvitationWithWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMyInvitations = useCallback(async () => {
    if (!profile?.email) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('email', profile.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
    } else {
      setInvitations(data as unknown as InvitationWithWorkspace[]);
    }
    setLoading(false);
  }, [profile?.email]);

  useEffect(() => {
    fetchMyInvitations();
  }, [fetchMyInvitations]);

  const acceptInvitation = async (invitation: InvitationWithWorkspace) => {
    if (!profile) return;
    
    setProcessingId(invitation.id);
    
    try {
      // Check if already a member
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('workspace_id', invitation.workspace_id)
        .maybeSingle();

      if (!existingRole) {
        // Add user to workspace
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: profile.id,
            workspace_id: invitation.workspace_id,
            role: invitation.role,
          });

        if (roleError) {
          throw roleError;
        }
      }

      // Mark invitation as accepted
      await supabase
        .from('workspace_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      toast({
        title: '¡Bienvenido!',
        description: `Te uniste a ${invitation.workspace?.name}`,
      });

      // Refresh
      window.location.reload();
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Error',
        description: 'No se pudo aceptar la invitación',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const declineInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);
    
    const { error } = await supabase
      .from('workspace_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la invitación',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitación rechazada',
      });
      await fetchMyInvitations();
    }
    
    setProcessingId(null);
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Invitaciones pendientes
        </CardTitle>
        <CardDescription>
          Te han invitado a unirte a estos espacios de trabajo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-background"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{invitation.workspace?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Como {ROLE_LABELS[invitation.role]}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptInvitation(invitation)}
                disabled={processingId === invitation.id}
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Aceptar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineInvitation(invitation.id)}
                disabled={processingId === invitation.id}
              >
                <X className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
