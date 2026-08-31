import { useState } from 'react';
import { Project, Task, Profile, SECTOR_LABELS, SECTOR_COLORS } from '@/types/database';
import { ChevronDown, ChevronUp, Pencil, CheckCircle2, Clock, AlertTriangle, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  profiles: Profile[];
  onEdit: (project: Project) => void;
  onTaskClick: (task: Task) => void;
  onOpenClients?: (project: Project) => void;
}

export function ProjectCard({ project, tasks, profiles, onEdit, onTaskClick, onOpenClients }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'completed');
  const activeTasks = projectTasks.filter(t => t.status !== 'completed');
  const riskTasks = projectTasks.filter(t => t.status === 'risk');

  const completionRate = projectTasks.length > 0 
    ? Math.round((completedTasks.length / projectTasks.length) * 100) 
    : 0;

  const getAssigneeName = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    const profile = profiles.find(p => p.id === assignedTo);
    return profile?.display_name || null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div 
      className={cn(
        "bg-card rounded-xl border border-border transition-all duration-200",
        isExpanded && "ring-1 ring-primary/20"
      )}
    >
      {/* Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors rounded-xl"
      >
        {/* Project Color Dot */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
          style={{ backgroundColor: project.color }}
        />
        
        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{project.name}</span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full hidden sm:inline-flex',
              SECTOR_COLORS[project.sector]
            )}>
              {SECTOR_LABELS[project.sector]}
            </span>
          </div>
          
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {completedTasks.length}/{projectTasks.length}
            </span>
            {riskTasks.length > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                {riskTasks.length} en riesgo
              </span>
            )}
            {activeTasks.length > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activeTasks.length} activas
              </span>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8">{completionRate}%</span>
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground py-3 border-b border-border">
              {project.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 pb-2 gap-2">
            {/* Feature badges */}
            <div className="flex gap-2">
              {(project as any).uses_clients && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenClients?.(project);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  Clientes
                </Button>
              )}
              {(project as any).uses_content_calendar && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Calendario
                </Badge>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          </div>

          {/* Tasks List */}
          {projectTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay tareas en este proyecto
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Active tasks first */}
              {activeTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    task.status === 'risk' ? 'bg-destructive' : 'bg-primary'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {getAssigneeName(task.assigned_to) && (
                        <span className="text-xs text-muted-foreground">
                          → {getAssigneeName(task.assigned_to)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="pt-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Completadas ({completedTasks.length})</p>
                  {completedTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors text-left opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm truncate line-through">{task.title}</p>
                    </button>
                  ))}
                  {completedTasks.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{completedTasks.length - 3} más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
