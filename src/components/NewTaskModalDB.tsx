import { useState } from 'react';
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
import { CalendarIcon, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskPriority, Profile, Project, LifeArea, RecurrenceType, LIFE_AREA_LABELS, LIFE_AREA_COLORS, RECURRENCE_LABELS } from '@/types/database';

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
  }) => void;
  profiles: Profile[];
  projects: Project[];
  currentProfileId: string;
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
}: NewTaskModalDBProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [lifeArea, setLifeArea] = useState<LifeArea>('trabajo');
  const [assignedTo, setAssignedTo] = useState<string>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [client, setClient] = useState('');

  // Get selected project to check if it uses clients
  const selectedProject = projects.find(p => p.id === projectId);
  const showClientField = selectedProject?.uses_clients || false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Validate client is provided if project uses clients
    if (showClientField && !client.trim()) return;

    onAddTask({
      title: title.trim(),
      priority,
      life_area: lifeArea,
      assigned_to: assignedTo === 'none' ? null : assignedTo,
      due_date: dueDate || null,
      project_id: projectId === 'none' ? null : projectId,
      recurrence_type: recurrenceType === 'none' ? null : recurrenceType as RecurrenceType,
      client: showClientField ? client.trim() : null,
    });

    setTitle('');
    setProjectId('none');
    setPriority('medium');
    setLifeArea('trabajo');
    setAssignedTo('none');
    setDueDate(undefined);
    setRecurrenceType('none');
    setClient('');
    onOpenChange(false);
  };

  const assignableProfiles = profiles.filter(p => p.id !== currentProfileId);

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
