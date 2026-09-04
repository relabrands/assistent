import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Task, 
  TaskNote, 
  Profile, 
  Project, 
  TaskStatus,
  TaskPriority,
  SECTOR_LABELS, 
  SECTOR_COLORS, 
  LIFE_AREA_LABELS, 
  LIFE_AREA_COLORS, 
  Subtask 
} from '@/types/database';
import { useTaskNotes } from '@/hooks/useTaskNotes';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Calendar, 
  Flag, 
  User, 
  Pencil, 
  CheckCircle2, 
  Circle, 
  ListTodo, 
  Plus, 
  Building2,
  Inbox,
  CalendarDays,
  AlertTriangle,
  FolderGit2,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  profiles: Profile[];
  projects: Project[];
  currentProfile: Profile;
  onEditTask?: (task: Task) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  inbox: {
    label: 'Inbox',
    icon: <Inbox className="w-3.5 h-3.5" />,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
  },
  week: {
    label: 'Esta semana',
    icon: <CalendarDays className="w-3.5 h-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900',
  },
  risk: {
    label: 'En riesgo',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900',
  },
  completed: {
    label: 'Completada',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  high: { label: 'Alta', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50 border-red-200', dot: 'bg-red-500' },
  medium: { label: 'Media', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200', dot: 'bg-yellow-500' },
  low: { label: 'Baja', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50 border-green-200', dot: 'bg-green-500' },
};

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  profiles,
  projects,
  currentProfile,
  onEditTask,
  onUpdateTask,
}: TaskDetailModalProps) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
  const { fetchNotes, addNote, deleteNote, loading: submitting } = useTaskNotes(currentProfile);

  useEffect(() => {
    if (task && open) {
      setLoadingNotes(true);
      fetchNotes(task.id).then((data) => {
        setNotes(data);
        setLoadingNotes(false);
      });
    }
  }, [task, open, fetchNotes]);

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task || !onUpdateTask) return;
    onUpdateTask(task.id, { 
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    if (!task || !onUpdateTask) return;
    onUpdateTask(task.id, { priority: newPriority });
  };

  const handleAddNote = async () => {
    if (!task || !newNote.trim()) return;

    const note = await addNote(task.id, newNote.trim());
    if (note) {
      setNotes([note, ...notes]);
      setNewNote('');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const success = await deleteNote(noteId);
    if (success) {
      setNotes(notes.filter(n => n.id !== noteId));
    }
  };

  const handleEdit = () => {
    if (task && onEditTask) {
      onOpenChange(false);
      onEditTask(task);
    }
  };

  const handleAddSubtask = () => {
    if (!task || !newSubtask.trim() || !onUpdateTask) return;
    
    const newSubtaskObj: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false,
      created_at: new Date().toISOString()
    };
    
    const updatedSubtasks = [...(task.subtasks || []), newSubtaskObj];
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtask('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!task || !onUpdateTask) return;
    
    const updatedSubtasks = (task.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!task || !onUpdateTask) return;
    
    const updatedSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  if (!task) return null;

  const assignee = profiles.find(p => p.id === task.assigned_to);
  const project = projects.find(p => p.id === task.project_id);
  const lifeAreaInfo = task.life_area ? LIFE_AREA_COLORS[task.life_area] : null;

  // Subtasks calculation
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Due date status
  let dueDateLabel = null;
  let dueDateColor = 'text-muted-foreground';
  if (task.due_date) {
    const d = parseISO(task.due_date);
    if (isPast(d) && !isToday(d) && task.status !== 'completed') {
      dueDateLabel = 'Vencida';
      dueDateColor = 'text-red-500 font-semibold';
    } else if (isToday(d)) {
      dueDateLabel = 'Hoy';
      dueDateColor = 'text-amber-500 font-semibold';
    } else if (isTomorrow(d)) {
      dueDateLabel = 'Mañana';
      dueDateColor = 'text-blue-500 font-medium';
    }
  }

  const isCompleted = task.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        
        {/* Top Header / Quick Control Bar */}
        <div className="px-6 pt-5 pb-4 border-b border-border/50 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Quick Status and Priority Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Selector */}
              <Select 
                value={task.status} 
                onValueChange={(val) => handleStatusChange(val as TaskStatus)}
              >
                <SelectTrigger className={cn(
                  'h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-lg border transition-all',
                  STATUS_CONFIG[task.status]?.bg,
                  STATUS_CONFIG[task.status]?.color
                )}>
                  {STATUS_CONFIG[task.status]?.icon}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">
                    <div className="flex items-center gap-2 text-xs">
                      <Inbox className="w-3.5 h-3.5 text-slate-500" />
                      <span>Inbox</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="week">
                    <div className="flex items-center gap-2 text-xs">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                      <span>Esta semana</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="risk">
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>En riesgo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Completada</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Selector */}
              <Select 
                value={task.priority} 
                onValueChange={(val) => handlePriorityChange(val as TaskPriority)}
              >
                <SelectTrigger className={cn(
                  'h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-lg border transition-all',
                  PRIORITY_CONFIG[task.priority]?.bg,
                  PRIORITY_CONFIG[task.priority]?.color
                )}>
                  <div className={cn('w-2 h-2 rounded-full', PRIORITY_CONFIG[task.priority]?.dot)} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Prioridad Alta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>Prioridad Media</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Prioridad Baja</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Edit modal trigger */}
            {onEditTask && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEdit} 
                className="h-8 text-xs gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar todo</span>
              </Button>
            )}
          </div>

          {/* Task Title */}
          <div>
            <h1 className={cn(
              "text-xl font-bold leading-snug tracking-tight text-foreground",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h1>
          </div>
        </div>

        {/* Navigation Tabs between Details and Notes */}
        <div className="px-6 pt-3 pb-0 border-b border-border/40 bg-background flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'notes')} className="w-full">
            <TabsList className="bg-muted/50 h-9 p-1">
              <TabsTrigger value="details" className="text-xs gap-1.5 px-3 h-7">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Propiedades y Subtareas</span>
                {totalSubtasks > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                    {completedSubtasks}/{totalSubtasks}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs gap-1.5 px-3 h-7">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Notas y Discusión</span>
                {notes.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-1">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Properties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/60 bg-card/60">
                {/* Project */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Proyecto</p>
                    {project ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <span className="text-xs font-semibold truncate">{project.name}</span>
                        {project.sector && (
                          <span className={cn('px-1.5 py-0.2 rounded text-[10px]', SECTOR_COLORS[project.sector])}>
                            {SECTOR_LABELS[project.sector]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin proyecto</span>
                    )}
                  </div>
                </div>

                {/* Client */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cliente</p>
                    {task.client ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-semibold text-primary truncate">{task.client}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin cliente asignado</span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Responsable</p>
                    {assignee ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {assignee.display_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium truncate">{assignee.display_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin asignar</span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fecha límite</p>
                    {task.due_date ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('text-xs', dueDateColor)}>
                          {format(new Date(task.due_date), 'd MMMM yyyy', { locale: es })}
                        </span>
                        {dueDateLabel && (
                          <Badge variant="outline" className={cn('text-[10px] h-4 px-1', dueDateColor)}>
                            {dueDateLabel}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin fecha programada</span>
                    )}
                  </div>
                </div>

                {/* Life Area (if exists) */}
                {lifeAreaInfo && (
                  <div className="flex items-center gap-2.5 min-w-0 sm:col-span-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <span>{lifeAreaInfo.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Área de vida</p>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5', lifeAreaInfo.bg, lifeAreaInfo.text)}>
                        {LIFE_AREA_LABELS[task.life_area!]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Subtareas</h3>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {completedSubtasks} de {totalSubtasks}
                    </Badge>
                  </div>
                  {totalSubtasks > 0 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {subtaskProgress}% completado
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {totalSubtasks > 0 && (
                  <Progress value={subtaskProgress} className="h-1.5 bg-muted" />
                )}

                {/* Subtask items */}
                <div className="space-y-2">
                  {(task.subtasks || []).map((subtask) => (
                    <div 
                      key={subtask.id} 
                      className={cn(
                        "flex items-center gap-2.5 group p-2.5 rounded-xl border transition-all",
                        subtask.completed 
                          ? "bg-muted/30 border-border/30 opacity-75" 
                          : "bg-card border-border/60 hover:border-primary/40 shadow-2xs"
                      )}
                    >
                      <button 
                        onClick={() => handleToggleSubtask(subtask.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                          subtask.completed 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "border-muted-foreground/40 hover:border-primary text-transparent hover:text-muted-foreground/30"
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={cn(
                        "text-xs sm:text-sm flex-1 break-words",
                        subtask.completed && "text-muted-foreground line-through"
                      )}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar subtarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Input */}
                <div className="flex gap-2 pt-1">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Agregar una nueva subtarea..."
                    className="h-9 text-xs sm:text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddSubtask()}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddSubtask} 
                    disabled={!newSubtask.trim()}
                    className="h-9 px-3 gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Agregar</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Notes & Discussion Tab */
            <div className="space-y-4">
              {/* Add Note Card */}
              <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribe una nota, actualización o comentario..."
                  className="min-h-[70px] text-xs sm:text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Presiona <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> para guardar
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handleAddNote} 
                    disabled={submitting || !newNote.trim()}
                    className="h-8 gap-1 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Guardar nota
                  </Button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                    Cargando notas...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/40 rounded-xl">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">No hay notas en esta tarea</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Usa el campo arriba para documentar avances</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/20 transition-colors group space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(note.creator?.display_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {note.creator?.display_name || 'Usuario'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(note.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
                          </span>
                        </div>

                        {note.created_by === currentProfile.id && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap pl-8">
                        {note.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with primary action */}
        <div className="px-6 py-3.5 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant={isCompleted ? "outline" : "default"}
            size="sm"
            onClick={() => handleStatusChange(isCompleted ? 'inbox' : 'completed')}
            className={cn(
              "gap-1.5 text-xs font-semibold",
              !isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Reabrir tarea
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar como completada
              </>
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cerrar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
