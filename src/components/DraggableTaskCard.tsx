import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Profile, Project, LIFE_AREA_LABELS, LIFE_AREA_COLORS, RECURRENCE_LABELS } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { GripVertical, Calendar, Trash2, Users, MessageSquare, Repeat, Building2 } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DraggableTaskCardProps {
  task: Task;
  profiles: Profile[];
  projects: Project[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
};

function formatDueDate(dueDate: string | null): { text: string; isOverdue: boolean; isUrgent: boolean } | null {
  if (!dueDate) return null;
  
  const date = new Date(dueDate);
  const isOverdue = isPast(date) && !isToday(date);
  const isUrgent = isToday(date) || isTomorrow(date);
  
  let text: string;
  if (isToday(date)) {
    text = 'Hoy';
  } else if (isTomorrow(date)) {
    text = 'Mañana';
  } else {
    text = format(date, 'd MMM', { locale: es });
  }
  
  return { text, isOverdue, isUrgent };
}

export function DraggableTaskCard({
  task,
  profiles,
  projects,
  onToggleComplete,
  onDelete,
  onOpenDetail,
  isDragging,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === 'completed';
  const dueDateInfo = formatDueDate(task.due_date);
  const assignee = profiles.find(p => p.id === task.assigned_to);
  const project = projects.find(p => p.id === task.project_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'task-card animate-fade-in group',
        isCompleted && 'opacity-60',
        isDragging && 'shadow-lg ring-2 ring-primary/20 z-50'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete(task.id)}
          className="mt-0.5"
        />
        
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenDetail(task)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('priority-dot', priorityColors[task.priority])} />
            <span className={cn(
              'text-sm font-medium',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {task.life_area && (
              <span 
                className={cn(
                  'area-badge text-xs flex items-center gap-1',
                  LIFE_AREA_COLORS[task.life_area].bg,
                  LIFE_AREA_COLORS[task.life_area].text
                )}
              >
                <span className="text-[10px]">{LIFE_AREA_COLORS[task.life_area].icon}</span>
                {LIFE_AREA_LABELS[task.life_area]}
              </span>
            )}
            
            {project && (
              <span 
                className="area-badge text-xs"
                style={{ 
                  backgroundColor: `${project.color}20`,
                  color: project.color,
                }}
              >
                {project.name}
              </span>
            )}

            {task.client && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                <Building2 className="w-3 h-3" />
                {task.client}
              </span>
            )}
            
            {assignee && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {assignee.display_name}
              </span>
            )}
            
            {task.recurrence_type && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Repeat className="w-3 h-3" />
                {RECURRENCE_LABELS[task.recurrence_type]}
              </span>
            )}
            
            {dueDateInfo && (
              <span className={cn(
                'flex items-center gap-1 text-xs',
                dueDateInfo.isOverdue ? 'text-destructive font-medium' : 
                dueDateInfo.isUrgent ? 'text-priority-medium font-medium' : 
                'text-muted-foreground'
              )}>
                <Calendar className="w-3 h-3" />
                {dueDateInfo.text}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDetail(task)}
            className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            title="Ver notas"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
