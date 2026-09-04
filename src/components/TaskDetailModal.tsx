import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, TaskNote, Profile, Project, SECTOR_LABELS, SECTOR_COLORS, LIFE_AREA_LABELS, LIFE_AREA_COLORS, Subtask } from '@/types/database';
import { useTaskNotes } from '@/hooks/useTaskNotes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Send, Trash2, Calendar, Flag, User, Pencil, CheckCircle2, Circle, ListTodo, Plus, Building2 } from 'lucide-react';
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

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between gap-2">
          <DialogTitle className="text-lg font-semibold pr-2 flex-1">{task.title}</DialogTitle>
          {onEditTask && (
            <Button variant="ghost" size="icon" onClick={handleEdit} className="flex-shrink-0">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mt-2">
          {lifeAreaInfo && (
            <div className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
              lifeAreaInfo.bg,
              lifeAreaInfo.text
            )}>
              <span>{lifeAreaInfo.icon}</span>
              {LIFE_AREA_LABELS[task.life_area!]}
            </div>
          )}

          {project && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-secondary">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
              <span>{project.name}</span>
              {project.sector && (
                <span className={cn('px-1.5 py-0.5 rounded text-[10px]', SECTOR_COLORS[project.sector])}>
                  {SECTOR_LABELS[project.sector]}
                </span>
              )}
            </div>
          )}

          {task.client && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Cliente: {task.client}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            <Flag className="w-3 h-3" />
            {priorityLabels[task.priority]}
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), 'd MMM yyyy', { locale: es })}
            </div>
          )}

          {assignee && (
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
              <User className="w-3 h-3" />
              {assignee.display_name}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
          {/* Subtareas Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Subtareas ({task.subtasks?.length || 0})</span>
              </div>
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {task.subtasks.filter(s => s.completed).length} / {task.subtasks.length} completadas
                </span>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {(task.subtasks || []).map((subtask) => (
                <div key={subtask.id} className="flex items-start gap-2 group bg-secondary/30 p-2 rounded-md">
                  <button 
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {subtask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <span className={cn("text-sm flex-1", subtask.completed && "text-muted-foreground line-through")}>
                    {subtask.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Agregar una subtarea..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddSubtask()}
              />
              <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Notas ({notes.length})</span>
          </div>

          <div className="flex gap-2 mb-3">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Agregar una nota..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
            />
            <Button size="icon" onClick={handleAddNote} disabled={submitting || !newNote.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-[200px]">
            {loadingNotes ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin notas aún
              </p>
            ) : (
              <div className="space-y-3 pr-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-secondary/50 rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      {note.created_by === currentProfile.id && (
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{note.creator?.display_name || 'Usuario'}</span>
                      <span>•</span>
                      <span>{format(new Date(note.created_at), 'd MMM, HH:mm', { locale: es })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
