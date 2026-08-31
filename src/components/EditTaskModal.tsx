import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Task, TaskPriority, Profile, Project, LifeArea, TaskStatus, LIFE_AREA_LABELS, LIFE_AREA_COLORS } from '@/types/database';

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onUpdateTask: (id: string, data: {
    title?: string;
    area?: string;
    priority?: TaskPriority;
    life_area?: LifeArea;
    assigned_to?: string | null;
    due_date?: Date | null;
    project_id?: string | null;
    status?: TaskStatus;
    client?: string | null;
  }) => Promise<boolean>;
  profiles: Profile[];
  projects: Project[];
  currentProfileId: string;
}

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'week', label: 'Esta semana' },
  { value: 'risk', label: 'En riesgo' },
  { value: 'completed', label: 'Completada' },
];

const lifeAreas: LifeArea[] = ['trabajo', 'personal', 'salud', 'aprendizaje', 'finanzas'];

export function EditTaskModal({ 
  open, 
  onOpenChange, 
  task,
  onUpdateTask, 
  profiles,
  projects,
  currentProfileId,
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [lifeArea, setLifeArea] = useState<LifeArea>('trabajo');
  const [assignedTo, setAssignedTo] = useState<string>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [client, setClient] = useState('');
  const [saving, setSaving] = useState(false);

  // Get selected project to check if it uses clients
  const selectedProject = projects.find(p => p.id === projectId);
  const showClientField = selectedProject?.uses_clients || false;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setProjectId(task.project_id || 'none');
      setPriority(task.priority);
      setStatus(task.status);
      setLifeArea(task.life_area || 'trabajo');
      setAssignedTo(task.assigned_to || 'none');
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setClient(task.client || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task) return;
    
    // Validate client is provided if project uses clients
    if (showClientField && !client.trim()) return;

    setSaving(true);

    const success = await onUpdateTask(task.id, {
      title: title.trim(),
      priority,
      status,
      life_area: lifeArea,
      assigned_to: assignedTo === 'none' ? null : assignedTo,
      due_date: dueDate || null,
      project_id: projectId === 'none' ? null : projectId,
      client: showClientField ? client.trim() : null,
    });

    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const assignableProfiles = profiles.filter(p => p.id !== currentProfileId);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Editar tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-sm font-medium">
              Título
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Proyecto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proyecto</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showClientField && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nombre del cliente"
                className="h-10"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Área de vida</Label>
            <Select value={lifeArea} onValueChange={(v) => setLifeArea(v as LifeArea)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lifeAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    <div className="flex items-center gap-2">
                      <span>{LIFE_AREA_COLORS[area].icon}</span>
                      {LIFE_AREA_LABELS[area]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Fecha límite</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: es }) : "Sin fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
                {dueDate && (
                  <div className="p-2 border-t">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setDueDate(undefined)}
                    >
                      Quitar fecha
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          
          {assignableProfiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delegar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sin delegar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin delegar (yo)</SelectItem>
                  {assignableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
