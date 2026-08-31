import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus, Profile, Project } from '@/types/database';
import { DraggableTaskCard } from './DraggableTaskCard';
import { cn } from '@/lib/utils';
import { Inbox, CalendarDays, AlertTriangle, Users, UserCheck } from 'lucide-react';

interface DroppableSectionProps {
  id: TaskStatus | 'delegated' | 'assigned';
  title: string;
  icon: 'inbox' | 'week' | 'risk' | 'delegated' | 'assigned';
  tasks: Task[];
  profiles: Profile[];
  projects: Project[];
  maxTasks?: number;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  emptyMessage?: string;
  variant?: 'default' | 'warning';
}

const icons = {
  inbox: Inbox,
  week: CalendarDays,
  risk: AlertTriangle,
  delegated: Users,
  assigned: UserCheck,
};

export function DroppableSection({
  id,
  title,
  icon,
  tasks,
  profiles,
  projects,
  maxTasks,
  onStatusChange,
  onToggleComplete,
  onDelete,
  onOpenDetail,
  emptyMessage = 'Sin tareas',
  variant = 'default',
}: DroppableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const Icon = icons[icon];
  const showCount = maxTasks !== undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl p-4 md:p-5 transition-colors min-h-[120px]',
        variant === 'warning' ? 'bg-destructive/5 border border-destructive/20' : 'bg-card border border-border',
        isOver && 'ring-2 ring-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'w-4 h-4',
            variant === 'warning' ? 'text-destructive' : 'text-muted-foreground'
          )} />
          <h2 className={cn(
            'section-header mb-0',
            variant === 'warning' && 'text-destructive'
          )}>
            {title}
          </h2>
        </div>
        
        {showCount && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            tasks.length >= (maxTasks || 0) 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-secondary text-muted-foreground'
          )}>
            {tasks.length}/{maxTasks}
          </span>
        )}
      </div>
      
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                profiles={profiles}
                projects={projects}
                onStatusChange={onStatusChange}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  );
}
