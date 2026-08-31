import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Workspace, WorkspaceInvitation } from '@/types/database';
import { Users, Mail, Loader2 } from 'lucide-react';

interface InvitationModalProps {
  open: boolean;
  invitation: WorkspaceInvitation;
  workspace: Workspace;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function InvitationModal({
  open,
  invitation,
  workspace,
  loading,
  onAccept,
  onDecline,
}: InvitationModalProps) {
  const roleText = invitation.role === 'admin' ? 'administrador' : 'colaborador';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Invitación al Workspace
          </DialogTitle>
          <DialogDescription className="text-center">
            Has sido invitado a unirte a un workspace
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{workspace.name}</p>
                <p className="text-sm text-muted-foreground">
                  Rol: <span className="capitalize font-medium">{roleText}</span>
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Al aceptar, tendrás acceso a los proyectos y tareas de este workspace.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Rechazar
          </Button>
          <Button
            onClick={onAccept}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uniéndose...
              </>
            ) : (
              'Aceptar invitación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
