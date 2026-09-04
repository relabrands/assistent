import { useState, useMemo } from 'react';
import { Task, Profile, Project, TaskStatus } from '@/types/database';
import { Client } from '@/types/content';
import { TaskFilters, TaskFiltersState, filterTasks } from './TaskFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ListTodo, 
  CheckCircle2, 
  AlertTriangle, 
  Inbox, 
  CalendarDays,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isPast, parseISO, isThisWeek } from 'date-fns';

type GroupBy = 'status' | 'project' | 'priority' | 'client';
type ViewMode = 'list' | 'board';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string; dotColor: string }> = {
  inbox: {
    label: 'Inbox',
    icon: <Inbox className="w-4 h-4" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 dark:bg-slate-900/50',
    dotColor: 'bg-slate-400',
  },
  week: {
    label: 'Esta semana',
    icon: <CalendarDays className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    dotColor: 'bg-blue-500',
  },
  risk: {
    label: 'En riesgo',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    dotColor: 'bg-amber-500',
  },
  completed: {
    label: 'Completadas',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    dotColor: 'bg-emerald-500',
  },
};

const STATUSES: TaskStatus[] = ['inbox', 'week', 'risk', 'completed'];

const PRIORITY_CONFIG = {
  high: { label: 'Alta', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500' },
  medium: { label: 'Media', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', dot: 'bg-yellow-500' },
  low: { label: 'Baja', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-500' },
};

interface TasksViewProps {
  tasks: Task[];
  profiles: Profile[];
  projects: Project[];
  clients?: Client[];
  currentProfileId: string;
  onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onDeleteTask: (id: string) => void;
  onOpenEditModal?: (task: Task) => void;
  onOpenDetailModal?: (task: Task) => void;
}

export function TasksView({
  tasks,
  profiles,
  projects,
  clients = [],
  currentProfileId,
  onUpdateTask,
  onDeleteTask,
  onOpenEditModal,
  onOpenDetailModal,
}: TasksViewProps) {
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    projectId: null,
    clientId: null,
    lifeArea: null,
    priority: null,
    status: null,
  });
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');

  // Stats
  const stats = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'completed');
    const completedToday = tasks.filter(t => 
      t.status === 'completed' && t.completed_at && isToday(parseISO(t.completed_at))
    );
    const overdue = tasks.filter(t => 
      t.status !== 'completed' && t.due_date && isPast(parseISO(t.due_date))
    );
    const dueThisWeek = tasks.filter(t =>
      t.status !== 'completed' && t.due_date && 
      isThisWeek(parseISO(t.due_date), { weekStartsOn: 1 }) &&
      !isPast(parseISO(t.due_date))
    );

    return {
      total: active.length,
      completedToday: completedToday.length,
      overdue: overdue.length,
      dueThisWeek: dueThisWeek.length,
      atRisk: tasks.filter(t => t.status === 'risk').length,
    };
  }, [tasks]);

  // Filter tasks first
  const filteredByFilters = useMemo(() => filterTasks(tasks, filters, clients), [tasks, filters, clients]);

  // Then by active tab (in list view)
  const filteredTasks = useMemo(() => {
    if (activeTab === 'all') return filteredByFilters;
    return filteredByFilters.filter(t => t.status === activeTab);
  }, [filteredByFilters, activeTab]);

  // Group tasks for list view
  const groupedTasks = useMemo(() => {
    if (groupBy === 'status') {
      const grouped: Record<string, Task[]> = {};
      STATUSES.forEach(s => { grouped[s] = []; });
      filteredTasks.forEach(t => {
        if (grouped[t.status]) grouped[t.status].push(t);
      });
      return grouped;
    }
    if (groupBy === 'project') {
      const grouped: Record<string, Task[]> = { sin_proyecto: [] };
      projects.forEach(p => { grouped[p.id] = []; });
      filteredTasks.forEach(t => {
        const key = t.project_id || 'sin_proyecto';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      });
      return grouped;
    }
    if (groupBy === 'priority') {
      const grouped: Record<string, Task[]> = { high: [], medium: [], low: [] };
      filteredTasks.forEach(t => { grouped[t.priority]?.push(t); });
      return grouped;
    }
    if (groupBy === 'client') {
      const grouped: Record<string, Task[]> = { sin_cliente: [] };
      clients.forEach(c => { grouped[c.id] = []; });
      filteredTasks.forEach(t => {
        let key = 'sin_cliente';
        if (t.client_id && grouped[t.client_id]) {
          key = t.client_id;
        } else if (t.client) {
          const found = clients.find(c => c.name === t.client || c.brand_name === t.client);
          if (found) {
            key = found.id;
          } else {
            if (!grouped[t.client]) grouped[t.client] = [];
            key = t.client;
          }
        }
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      });
      return grouped;
    }
    return {};
  }, [filteredTasks, groupBy, projects, clients]);

  const tabCounts = useMemo(() => {
    const result: Record<string, number> = { all: filteredByFilters.length };
    STATUSES.forEach(s => {
      result[s] = filteredByFilters.filter(t => t.status === s).length;
    });
    return result;
  }, [filteredByFilters]);

  const getGroupLabel = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.label || key;
    if (groupBy === 'project') {
      if (key === 'sin_proyecto') return 'Sin proyecto';
      return projects.find(p => p.id === key)?.name || key;
    }
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.label || key;
    if (groupBy === 'client') {
      if (key === 'sin_cliente') return 'Sin cliente asignado';
      const c = clients.find(item => item.id === key);
      return c ? (c.brand_name || c.name) : key;
    }
    return key;
  };

  const getGroupColor = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.dotColor || 'bg-gray-400';
    if (groupBy === 'project') {
      if (key === 'sin_proyecto') return 'bg-gray-400';
      const color = projects.find(p => p.id === key)?.color;
      return color ? '' : 'bg-gray-400';
    }
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.dot || 'bg-gray-400';
    if (groupBy === 'client') return key === 'sin_cliente' ? 'bg-gray-400' : 'bg-primary';
    return 'bg-gray-400';
  };

  const getGroupProjectColor = (key: string) => {
    if (groupBy === 'project') return projects.find(p => p.id === key)?.color;
    return undefined;
  };

  const getGroupBg = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.bgColor || '';
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.bg || '';
    return '';
  };

  // Quick toggle task status to next
  const advanceTaskStatus = (task: Task) => {
    const nextMap: Record<TaskStatus, TaskStatus> = {
      inbox: 'week',
      week: 'completed',
      risk: 'completed',
      completed: 'inbox',
    };
    onUpdateTask(task.id, { status: nextMap[task.status] });
  };

  const handleClientTagClick = (e: React.MouseEvent, clientIdOrName: string | null) => {
    e.stopPropagation();
    if (!clientIdOrName) return;
    const clientObj = clients.find(c => c.id === clientIdOrName || c.name === clientIdOrName || c.brand_name === clientIdOrName);
    setFilters(prev => ({
      ...prev,
      clientId: prev.clientId === (clientObj ? clientObj.id : clientIdOrName) ? null : (clientObj ? clientObj.id : clientIdOrName),
    }));
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <StatCard
          icon={<ListTodo className="w-4 h-4 text-blue-500" />}
          label="Activas"
          value={stats.total}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          label="Completadas hoy"
          value={stats.completedToday}
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          label="En riesgo"
          value={stats.atRisk}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-red-500" />}
          label="Vencidas"
          value={stats.overdue}
          color="text-red-600"
          bg="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <TaskFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          projects={projects}
          clients={clients}
        />
      </div>

      {/* Controls Bar: Tabs + View Switcher + Group by */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        {/* Status tabs (shown in list mode) */}
        {viewMode === 'list' ? (
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              count={tabCounts.all}
            >
              Todas
            </TabButton>
            {STATUSES.map(s => (
              <TabButton
                key={s}
                active={activeTab === s}
                onClick={() => setActiveTab(s)}
                count={tabCounts[s]}
                icon={STATUS_CONFIG[s].icon}
                color={STATUS_CONFIG[s].color}
              >
                {STATUS_CONFIG[s].label}
              </TabButton>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Tablero Kanban interactivo · {filteredByFilters.length} tareas
          </div>
        )}

        {/* View mode toggle & Group by dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablero</span>
            </Button>
          </div>

          {/* Group by (in list view) */}
          {viewMode === 'list' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Agrupar: {groupBy === 'status' ? 'Estado' : groupBy === 'project' ? 'Proyecto' : groupBy === 'client' ? 'Cliente' : 'Prioridad'}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy('status')}>
                  <ListTodo className="w-4 h-4 mr-2" /> Estado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('project')}>
                  <LayoutGrid className="w-4 h-4 mr-2" /> Proyecto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('client')}>
                  <Users className="w-4 h-4 mr-2 text-primary" /> Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('priority')}>
                  <AlertTriangle className="w-4 h-4 mr-2" /> Prioridad
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main View Area: List or Board */}
      {viewMode === 'list' ? (
        /* List Mode */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.entries(groupedTasks).map(([key, groupTasks]) => {
            if (groupTasks.length === 0) return null;
            const projectColor = getGroupProjectColor(key);
            const clientObj = groupBy === 'client' ? clients.find(c => c.id === key) : null;

            return (
              <div key={key} className="space-y-1.5">
                {/* Group header */}
                <div className="flex items-center gap-2 py-1">
                  {groupBy === 'client' && clientObj ? (
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(clientObj.brand_name || clientObj.name).charAt(0).toUpperCase()}
                    </div>
                  ) : projectColor ? (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} />
                  ) : (
                    <div className={cn('w-2.5 h-2.5 rounded-full', getGroupColor(key))} />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getGroupLabel(key)}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-semibold ml-0.5">
                    {groupTasks.length}
                  </Badge>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Tasks container */}
                <div className={cn('rounded-lg overflow-hidden border border-border/40', activeTab === 'all' ? getGroupBg(key) : '')}>
                  {groupTasks.map((task) => {
                    const project = projects.find(p => p.id === task.project_id);
                    const assignee = profiles.find(p => p.id === task.assigned_to);

                    return (
                      <div
                        key={task.id}
                        className="group relative border-b last:border-b-0 border-border/40 bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => onOpenDetailModal?.(task)}
                      >
                        <div className="flex items-center gap-3 px-3 py-3">
                          {/* Status toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTask(task.id, {
                                status: task.status === 'completed' ? 'inbox' : 'completed',
                              });
                            }}
                            className={cn(
                              'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110',
                              task.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-muted-foreground/40 hover:border-primary'
                            )}
                          >
                            {task.status === 'completed' && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                          </button>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                'text-sm font-medium truncate',
                                task.status === 'completed' && 'line-through text-muted-foreground'
                              )}>
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {/* Project pill */}
                              {project && groupBy !== 'project' && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                                  {project.name}
                                </span>
                              )}

                              {/* Client pill — clickable to filter */}
                              {task.client && (
                                <button
                                  onClick={(e) => handleClientTagClick(e, task.client_id || task.client)}
                                  className={cn(
                                    'flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all',
                                    filters.clientId === task.client_id
                                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                      : 'bg-primary/10 text-primary hover:bg-primary/20 font-medium'
                                  )}
                                  title="Filtrar por este cliente"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  {task.client}
                                </button>
                              )}

                              {/* Due date */}
                              {task.due_date && (
                                <span className={cn(
                                  'text-[11px] flex items-center gap-1',
                                  isPast(parseISO(task.due_date)) && task.status !== 'completed'
                                    ? 'text-red-500 font-medium'
                                    : isToday(parseISO(task.due_date))
                                    ? 'text-amber-500 font-medium'
                                    : 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarDays className="w-2.5 h-2.5" />
                                  {new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right side: priority + avatar + quick action */}
                          <div className="flex items-center gap-2 shrink-0">
                            <PriorityDot priority={task.priority} />
                            {assignee && (
                              <div 
                                title={assignee.display_name}
                                className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary"
                              >
                                {assignee.display_name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Quick edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); onOpenEditModal?.(task); }}
                              title="Editar tarea"
                            >
                              <List className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Priority indicator bar on left edge */}
                        <div className={cn(
                          'absolute left-0 top-0 bottom-0 w-0.5 rounded-full',
                          task.priority === 'high' && task.status !== 'completed' ? 'bg-red-400' :
                          task.priority === 'medium' && task.status !== 'completed' ? 'bg-yellow-400' :
                          task.priority === 'low' && task.status !== 'completed' ? 'bg-green-400' : 'bg-transparent'
                        )} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-muted-foreground">No hay tareas encontradas</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {Object.values(filters).some(Boolean)
                  ? 'Prueba ajustando o limpiando los filtros'
                  : 'Crea tu primera tarea con el botón "Nueva tarea"'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Board (Kanban) Mode */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[768px]">
            {STATUSES.map((statusKey) => {
              const statusTasks = filteredByFilters.filter(t => t.status === statusKey);
              const config = STATUS_CONFIG[statusKey];

              return (
                <div 
                  key={statusKey} 
                  className="flex flex-col h-full bg-muted/30 rounded-xl p-3 border border-border/50 min-h-0"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                      <span className="font-semibold text-xs text-foreground uppercase tracking-wide">
                        {config.label}
                      </span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs font-bold">
                      {statusTasks.length}
                    </Badge>
                  </div>

                  {/* Tasks in Column */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {statusTasks.map((task) => {
                      const project = projects.find(p => p.id === task.project_id);
                      const assignee = profiles.find(p => p.id === task.assigned_to);

                      return (
                        <div
                          key={task.id}
                          onClick={() => onOpenDetailModal?.(task)}
                          className="group relative bg-card hover:bg-accent/40 border border-border/60 hover:border-primary/40 rounded-lg p-3 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-2"
                        >
                          {/* Priority color bar */}
                          <div className={cn(
                            'absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
                            task.priority === 'high' && task.status !== 'completed' ? 'bg-red-400' :
                            task.priority === 'medium' && task.status !== 'completed' ? 'bg-yellow-400' :
                            task.priority === 'low' && task.status !== 'completed' ? 'bg-green-400' : 'bg-transparent'
                          )} />

                          <div className="flex items-start justify-between gap-2 pl-1">
                            <span className={cn(
                              'text-sm font-medium leading-snug',
                              task.status === 'completed' && 'line-through text-muted-foreground'
                            )}>
                              {task.title}
                            </span>
                            <PriorityDot priority={task.priority} />
                          </div>

                          {/* Meta pills */}
                          <div className="flex flex-wrap items-center gap-1.5 pl-1">
                            {project && (
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ 
                                  backgroundColor: `${project.color}15`, 
                                  color: project.color 
                                }}
                              >
                                {project.name}
                              </span>
                            )}

                            {task.client && (
                              <button
                                onClick={(e) => handleClientTagClick(e, task.client_id || task.client)}
                                className={cn(
                                  'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full transition-all',
                                  filters.clientId === task.client_id
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20 font-medium'
                                )}
                                title="Filtrar por este cliente"
                              >
                                <Users className="w-2.5 h-2.5" />
                                {task.client}
                              </button>
                            )}
                          </div>

                          {/* Footer: Due date + Assignee + Advance button */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px] text-muted-foreground pl-1">
                            <div>
                              {task.due_date ? (
                                <span className={cn(
                                  'flex items-center gap-1',
                                  isPast(parseISO(task.due_date)) && task.status !== 'completed'
                                    ? 'text-red-500 font-semibold'
                                    : isToday(parseISO(task.due_date))
                                    ? 'text-amber-500 font-semibold'
                                    : 'text-muted-foreground'
                                )}>
                                  <CalendarDays className="w-3 h-3" />
                                  {new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                                </span>
                              ) : (
                                <span>Sin fecha</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {assignee && (
                                <div 
                                  title={assignee.display_name}
                                  className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary"
                                >
                                  {assignee.display_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {/* Advance status button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceTaskStatus(task);
                                }}
                                title="Avanzar estado"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {statusTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/40 rounded-lg text-center p-3">
                        <p className="text-xs text-muted-foreground">Sin tareas</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-xl p-3 border border-border/50 flex items-center gap-3', bg)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className={cn('text-xl font-bold leading-none', color)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function TabButton({ 
  active, onClick, count, icon, color, children 
}: { 
  active: boolean; onClick: () => void; count: number; icon?: React.ReactNode; color?: string; children: React.ReactNode 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      {icon && <span className={active ? 'text-primary-foreground' : color}>{icon}</span>}
      {children}
      <Badge 
        variant="secondary" 
        className={cn(
          'h-4 px-1 text-[10px] font-bold ml-0.5',
          active ? 'bg-white/20 text-white' : ''
        )}
      >
        {count}
      </Badge>
    </button>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors = {
    high: 'bg-red-400',
    medium: 'bg-yellow-400',
    low: 'bg-green-400',
  };
  return (
    <div
      title={priority}
      className={cn('w-2 h-2 rounded-full shrink-0', colors[priority as keyof typeof colors] || 'bg-gray-300')}
    />
  );
}
