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
import { CalendarIcon, Loader2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Task, TaskPriority, Profile, Project, LifeArea, TaskStatus, LIFE_AREA_LABELS, LIFE_AREA_COLORS } from '@/types/database';
import { Client } from '@/types/content';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

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
    client_id?: string | null;
  }) => Promise<boolean>;
  profiles: Profile[];
  projects: Project[];
  currentProfileId: string;
  clients?: Client[];
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
  clients,
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [lifeArea, setLifeArea] = useState<LifeArea>('trabajo');
  const [assignedTo, setAssignedTo] = useState<string>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [clientId, setClientId] = useState<string>('none');
  const [projectClients, setProjectClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load clients when project changes (fallback if clients prop not provided)
  useEffect(() => {
    if (projectId === 'none') {
      setProjectClients([]);
      return;
    }
    if (clients && clients.length > 0) return;

    setLoadingClients(true);
    getDocs(query(collection(db, 'clients'), where('project_id', '==', projectId)))
      .then((snap) => {
        setProjectClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
      })
      .catch(console.error)
      .finally(() => setLoadingClients(false));
  }, [projectId, clients]);

  const activeClients = (clients && clients.length > 0)
    ? clients.filter(c => c.project_id === projectId)
    : projectClients;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setProjectId(task.project_id || 'none');
      setPriority(task.priority);
      setStatus(task.status);
      setLifeArea(task.life_area || 'trabajo');
      setAssignedTo(task.assigned_to || 'none');
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      
      // If task has client_id, use it; otherwise try to match by name
      if (task.client_id) {
        setClientId(task.client_id);
      } else if (task.client && activeClients.length > 0) {
        const found = activeClients.find(c => c.name === task.client || c.brand_name === task.client);
        setClientId(found ? found.id : 'none');
      } else {
        setClientId('none');
      }
    }
  }, [task, activeClients]);

  const selectedClient = activeClients.find(c => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task) return;

    setSaving(true);
    const success = await onUpdateTask(task.id, {
      title: title.trim(),
      priority,
      status,
      life_area: lifeArea,
      assigned_to: assignedTo === 'none' ? null : assignedTo,
      due_date: dueDate || null,
      project_id: projectId === 'none' ? null : projectId,
      client: selectedClient ? (selectedClient.brand_name || selectedClient.name) : null,
      client_id: clientId === 'none' ? null : clientId,
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

          {/* Client selector — shown when project is selected */}
          {projectId !== 'none' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Cliente <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={clientId} onValueChange={setClientId} disabled={loadingClients && activeClients.length === 0}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={loadingClients ? 'Cargando...' : 'Sin cliente'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {(c.brand_name || c.name).charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{c.brand_name || c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {activeClients.length === 0 && !loadingClients && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Este proyecto no tiene clientes
                    </div>
                  )}
                </SelectContent>
              </Select>
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
