import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Workspace } from '@/types/database';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
  otherWorkspaces: Workspace[];
  hasData: boolean;
  onConfirm: (transferToWorkspaceId: string | null) => Promise<boolean>;
}

export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  otherWorkspaces,
  hasData,
  onConfirm,
}: DeleteWorkspaceDialogProps) {
  const [transferWorkspaceId, setTransferWorkspaceId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    const success = await onConfirm(hasData && transferWorkspaceId ? transferWorkspaceId : null);
    setIsDeleting(false);
    if (success) {
      setTransferWorkspaceId('');
      onOpenChange(false);
    }
  };

  if (!workspace) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            ¿Eliminar workspace?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Estás a punto de eliminar el workspace <strong>"{workspace.name}"</strong>. 
                Esta acción no se puede deshacer.
              </p>
              
              {hasData && (
                <div className="p-4 rounded-lg bg-muted border space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Este workspace contiene tareas y/o proyectos.
                  </p>
                  
                  {otherWorkspaces.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-sm">Transferir datos a:</Label>
                      <Select value={transferWorkspaceId} onValueChange={setTransferWorkspaceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar workspace destino..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delete">
                            <span className="text-destructive">Eliminar todo</span>
                          </SelectItem>
                          {otherWorkspaces.map((ws) => (
                            <SelectItem key={ws.id} value={ws.id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Si seleccionas "Eliminar todo", se borrarán todas las tareas y proyectos.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">
                      No tienes otros workspaces. Todos los datos serán eliminados permanentemente.
                    </p>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || (hasData && otherWorkspaces.length > 0 && !transferWorkspaceId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar workspace'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
