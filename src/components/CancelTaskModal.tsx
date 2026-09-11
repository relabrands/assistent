import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, Profile, CANCELLATION_REASONS } from '@/types/database';
import { Ban, AlertCircle, Loader2, MessageSquare } from 'lucide-react';

interface CancelTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  currentProfile?: Profile | null;
  onConfirmCancel: (taskId: string, reason: string, comment: string) => Promise<boolean>;
}

export function CancelTaskModal({
  open,
  onOpenChange,
  task,
  currentProfile,
  onConfirmCancel,
}: CancelTaskModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('cliente');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const handleConfirm = async () => {
    if (!task) return;
    setLoading(true);

    const reasonObj = CANCELLATION_REASONS.find(r => r.value === selectedReason);
    const reasonLabel = reasonObj ? reasonObj.label : selectedReason;

    const success = await onConfirmCancel(task.id, reasonLabel, comment.trim());
    setLoading(false);

    if (success) {
      setComment('');
      setSelectedReason('cliente');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-5">
        <DialogHeader className="gap-2 text-left">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Descartar / Cancelar tarea
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              En lugar de borrar la tarea, se marcará como cancelada para no perder el historial ni las decisiones del equipo.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Task target preview */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Tarea seleccionada:</p>
          <p className="font-semibold text-foreground text-sm mt-0.5 line-clamp-2">
            {task.title}
          </p>
          {task.client && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
              {task.client}
            </span>
          )}
        </div>

        {/* Reason selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Motivo principal del descarte <span className="text-rose-500">*</span>
          </Label>
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Selecciona un motivo" />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comment field */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            Comentario o justificación (opcional)
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ej: El cliente solicitó pausar la campaña hasta el próximo mes..."
            rows={3}
            className="text-xs resize-none rounded-xl"
          />
          <p className="text-[10px] text-muted-foreground">
            Este comentario se guardará permanentemente en las notas y actividad de la tarea.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 text-xs rounded-xl w-full sm:w-auto"
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="h-9 text-xs font-semibold rounded-xl w-full sm:w-auto gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                Confirmar descarte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
