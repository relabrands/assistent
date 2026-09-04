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
import { CalendarIcon, Repeat, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskPriority, Profile, Project, LifeArea, RecurrenceType, LIFE_AREA_LABELS, LIFE_AREA_COLORS, RECURRENCE_LABELS } from '@/types/database';
import { Client } from '@/types/content';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

interface NewTaskModalDBProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: {
    title: string;
    priority: TaskPriority;
    life_area: LifeArea;
    assigned_to: string | null;
    due_date: Date | null;
    project_id: string | null;
    recurrence_type: RecurrenceType | null;
    client: string | null;
    client_id: string | null;
  }) => void;
  profiles: Profile[];
  projects: Project[];
  currentProfileId: string;
  clients?: Client[];
}

const recurrenceOptions: { value: RecurrenceType; label: string; icon: string }[] = [
  { value: 'daily', label: 'Diaria', icon: '📅' },
  { value: 'weekly', label: 'Semanal', icon: '📆' },
  { value: 'monthly', label: 'Mensual', icon: '🗓️' },
];

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const lifeAreas: LifeArea[] = ['trabajo', 'personal', 'salud', 'aprendizaje', 'finanzas'];

export function NewTaskModalDB({ 
  open, 
  onOpenChange, 
  onAddTask, 
  profiles,
  projects,
  currentProfileId,
  clients,
}: NewTaskModalDBProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [lifeArea, setLifeArea] = useState<LifeArea>('trabajo');
  const [assignedTo, setAssignedTo] = useState<string>(currentProfileId);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [clientId, setClientId] = useState<string>('none');
  const [projectClients, setProjectClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setProjectId('none');
      setPriority('medium');
      setLifeArea('trabajo');
      setAssignedTo(currentProfileId);
      setDueDate(undefined);
      setRecurrenceType('none');
      setClientId('none');
      setProjectClients([]);
    }
  }, [open, currentProfileId]);

  // Load clients when project changes
  useEffect(() => {
    if (projectId === 'none') {
      setProjectClients([]);
      setClientId('none');
      return;
    }

    setClientId('none');
    if (clients && clients.length > 0) return;

    setLoadingClients(true);
    getDocs(query(collection(db, 'clients'), where('project_id', '==', projectId)))
      .then((snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        setProjectClients(items);
      })
      .catch(console.error)
      .finally(() => setLoadingClients(false));
  }, [projectId, clients]);

  const activeClients = (clients && clients.length > 0)
    ? clients.filter(c => c.project_id === projectId)
    : projectClients;

  const selectedClient = activeClients.find(c => c.id === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      priority,
      life_area: lifeArea,
      assigned_to: assignedTo,
      due_date: dueDate || null,
      project_id: projectId === 'none' ? null : projectId,
      recurrence_type: recurrenceType === 'none' ? null : recurrenceType as RecurrenceType,
      client: selectedClient ? (selectedClient.brand_name || selectedClient.name) : null,
      client_id: clientId === 'none' ? null : clientId,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Nueva tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              ¿Qué necesitas hacer?
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Revisar contrato cliente..."
              className="h-11"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
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

          {/* Client selector — only shown when project has clients */}
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
                        <div className="min-w-0">
                          <p className="truncate">{c.brand_name || c.name}</p>
                          {c.brand_name && (
                            <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                          )}
                        </div>
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
            <Label className="text-sm font-medium">Fecha límite (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Repetición (opcional)</Label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sin repetición" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-muted-foreground" />
                    Sin repetición
                  </div>
                </SelectItem>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {profiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Asignar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id === currentProfileId ? `${p.display_name} (Yo)` : p.display_name}
                    </SelectItem>
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
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Agregar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
