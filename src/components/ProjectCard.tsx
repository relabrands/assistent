import { useState } from 'react';
import { Project, Task, Profile, SECTOR_LABELS, SECTOR_COLORS } from '@/types/database';
import { 
  CheckCircle2, Clock, AlertTriangle, Users, 
  ChevronRight, Pencil, MoreHorizontal, Trash2, 
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  profiles: Profile[];
  onEdit: (project: Project) => void;
  onDelete?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onOpenClients?: (project: Project) => void;
}

function CircularProgress({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} fill="none"
        stroke="currentColor" className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} fill="none"
        stroke="currentColor" strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="text-primary transition-all duration-700" />
    </svg>
  );
}

export function ProjectCard({ project, tasks, profiles, onEdit, onDelete, onTaskClick, onOpenClients }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'completed');
  const activeTasks = projectTasks.filter(t => t.status !== 'completed');
  const riskTasks = projectTasks.filter(t => t.status === 'risk');
  const completionRate = projectTasks.length > 0 
    ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  const assigneeIds = [...new Set(projectTasks.map(t => t.assigned_to).filter(Boolean) as string[])];
  const assignees = assigneeIds.slice(0, 3).map(id => profiles.find(p => p.id === id)).filter(Boolean) as Profile[];
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const getPriorityStyle = (priority: string) => {
    if (priority === 'high') return 'text-destructive bg-destructive/10';
    if (priority === 'medium') return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    return 'text-muted-foreground bg-muted';
  };
  const getPriorityLabel = (p: string) => p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja';

  return (
    <div className={cn(
      "group relative bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300",
      "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5",
      isExpanded && "ring-2 ring-primary/20 shadow-md"
    )}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: project.color }} />
      <div className="p-5 pt-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ backgroundColor: project.color }}>
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base leading-tight truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar proyecto
                  </DropdownMenuItem>
                  {onOpenClients && (
                    <DropdownMenuItem onClick={() => onOpenClients(project)}>
                      <Users className="w-4 h-4 mr-2" /> Gestionar clientes
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive"
                        onClick={() => { if (confirm('¿Eliminar este proyecto?')) onDelete(project.id); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-1.5">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SECTOR_COLORS[project.sector])}>
                {SECTOR_LABELS[project.sector]}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <CircularProgress value={completionRate} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold leading-none">{completionRate}%</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-base font-bold leading-none">{projectTasks.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
            </div>
            <div>
              <p className={cn("text-base font-bold leading-none", activeTasks.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                {activeTasks.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Activas</p>
            </div>
            <div>
              <p className={cn("text-base font-bold leading-none", riskTasks.length > 0 ? "text-destructive" : "text-muted-foreground")}>
                {riskTasks.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">En riesgo</p>
            </div>
          </div>
          {assignees.length > 0 && (
            <div className="flex -space-x-2 flex-shrink-0">
              {assignees.map(a => (
                <Avatar key={a.id} className="w-7 h-7 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(a.display_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assigneeIds.length > 3 && (
                <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                  +{assigneeIds.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-border/50">
          {onOpenClients && (
            <Button variant="ghost" size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenClients(project)}>
              <Users className="w-3.5 h-3.5" /> Clientes
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}>
            <Clock className="w-3.5 h-3.5" />
            {isExpanded ? 'Ocultar' : `Tareas (${activeTasks.length})`}
            <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-90")} />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border/50 bg-muted/20 px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {activeTasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin tareas pendientes</p>
            </div>
          ) : (
            activeTasks.map(task => (
              <button key={task.id} onClick={() => onTaskClick(task)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/20 transition-all text-left group/task">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5",
                  task.status === 'risk' ? 'bg-destructive' : 'bg-primary/60')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", getPriorityStyle(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/task:opacity-100 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

