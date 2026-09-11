import { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  DragOverlay, 
  closestCenter, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  useDroppable 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Profile, Project, TaskStatus, isUnpublishedContentTask } from '@/types/database';
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
  Users,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  GripVertical,
  Activity,
  ImageOff,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isPast, parseISO, isThisWeek } from 'date-fns';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { CancelTaskModal } from './CancelTaskModal';

type GroupBy = 'status' | 'project' | 'priority' | 'client';
type ViewMode = 'list' | 'board';

export function getSmartTaskStatus(task: Task): TaskStatus {
  if (task.status === 'completed' || task.status === 'cancelled') return task.status;
  if (isUnpublishedContentTask(task)) return task.status;
  if (!task.due_date) return task.status || 'inbox';

  try {
    const dueDate = parseISO(task.due_date);
    if (isNaN(dueDate.getTime())) return task.status || 'inbox';

    // 1. Due this week (Monday to Sunday of current week) -> belongs in 'week'
    if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
      if (task.status === 'inbox') return 'week';
      return task.status;
    }

    // 2. Overdue prior to current week -> belongs in 'risk'
    if (isPast(dueDate) && !isToday(dueDate)) {
      if (task.status === 'inbox' || task.status === 'week') return 'risk';
      return task.status;
    }

    return task.status || 'inbox';
  } catch {
    return task.status || 'inbox';
  }
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; sublabel: string; icon: React.ReactNode; color: string; bgColor: string; dotColor: string; accentColor: string }> = {
  inbox: {
    label: 'Inbox',
    sublabel: 'Sin programar',
    icon: <Inbox className="w-4 h-4" />,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900/40',
    dotColor: 'bg-slate-400',
    accentColor: '#64748b',
  },
  week: {
    label: 'Esta Semana',
    sublabel: 'Vence esta semana',
    icon: <CalendarDays className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/70 dark:bg-blue-950/30',
    dotColor: 'bg-blue-500',
    accentColor: '#3b82f6',
  },
  risk: {
    label: 'En Riesgo',
    sublabel: 'Vencidas o alertas',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/70 dark:bg-amber-950/30',
    dotColor: 'bg-amber-500',
    accentColor: '#f59e0b',
  },
  completed: {
    label: 'Completadas',
    sublabel: 'Finalizadas',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    dotColor: 'bg-emerald-500',
    accentColor: '#10b981',
  },
  cancelled: {
    label: 'Canceladas',
    sublabel: 'Descartadas',
    icon: <Ban className="w-4 h-4" />,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50/70 dark:bg-rose-950/30',
    dotColor: 'bg-rose-500',
    accentColor: '#f43f5e',
  },
};

const PIPELINE_STATUSES: TaskStatus[] = ['inbox', 'week', 'risk', 'completed'];
const ALL_STATUSES: TaskStatus[] = ['inbox', 'week', 'risk', 'completed', 'cancelled'];
const STATUSES: TaskStatus[] = PIPELINE_STATUSES;

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
  onOpenNotion?: () => void;
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
  onOpenNotion,
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
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showCancelledInBoard, setShowCancelledInBoard] = useState(false);
  const [cancellingTask, setCancellingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // Split tasks: unpublished content items vs regular workflow tasks (including Notion quota/volume alerts)
  const notionContentTasks = useMemo(() => tasks.filter(t => isUnpublishedContentTask(t) && t.status !== 'completed' && t.status !== 'cancelled'), [tasks]);

  const smartRegularTasks = useMemo(() => {
    return tasks
      .filter(t => !isUnpublishedContentTask(t))
      .map(t => {
        const smart = getSmartTaskStatus(t);
        if (smart !== t.status) {
          return { ...t, status: smart };
        }
        return t;
      });
  }, [tasks]);

  const allSmartTasks = useMemo(() => {
    return tasks.map(t => {
      if (isUnpublishedContentTask(t)) return t;
      const smart = getSmartTaskStatus(t);
      if (smart !== t.status) return { ...t, status: smart };
      return t;
    });
  }, [tasks]);

  const stats = useMemo(() => {
    const active = allSmartTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const completedToday = allSmartTasks.filter(t => t.status === 'completed' && t.completed_at && isToday(parseISO(t.completed_at)));
    const overdue = allSmartTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
    const cancelledCount = allSmartTasks.filter(t => t.status === 'cancelled').length;
    return {
      total: active.length,
      completedToday: completedToday.length,
      overdue: overdue.length,
      atRisk: smartRegularTasks.filter(t => t.status === 'risk').length,
      contentPending: notionContentTasks.length,
      cancelled: cancelledCount,
    };
  }, [allSmartTasks, smartRegularTasks, notionContentTasks]);

  const filteredByFilters = useMemo(() => filterTasks(allSmartTasks, filters, clients), [allSmartTasks, filters, clients]);
  const filteredRegular = useMemo(() => filterTasks(smartRegularTasks, filters, clients), [smartRegularTasks, filters, clients]);
  const filteredContent = useMemo(() => filterTasks(notionContentTasks, filters, clients), [notionContentTasks, filters, clients]);

  const filteredTasks = useMemo(() => {
    if (activeTab === 'all') return filteredByFilters;
    return filteredByFilters.filter(t => t.status === activeTab);
  }, [filteredByFilters, activeTab]);

  const activeDragTask = useMemo(() => allSmartTasks.find(t => t.id === activeDragId) || null, [allSmartTasks, activeDragId]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'status') {
      const grouped: Record<string, Task[]> = {};
      ALL_STATUSES.forEach(s => { grouped[s] = []; });
      filteredTasks.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });
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
          if (found) { key = found.id; }
          else { if (!grouped[t.client]) grouped[t.client] = []; key = t.client; }
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
    ALL_STATUSES.forEach(s => { result[s] = filteredByFilters.filter(t => t.status === s).length; });
    return result;
  }, [filteredByFilters]);

  const getGroupLabel = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.label || key;
    if (groupBy === 'project') { if (key === 'sin_proyecto') return 'Sin proyecto'; return projects.find(p => p.id === key)?.name || key; }
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.label || key;
    if (groupBy === 'client') { if (key === 'sin_cliente') return 'Sin cliente asignado'; const c = clients.find(item => item.id === key); return c ? (c.brand_name || c.name) : key; }
    return key;
  };

  const getGroupColor = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.dotColor || 'bg-gray-400';
    if (groupBy === 'project') { if (key === 'sin_proyecto') return 'bg-gray-400'; return projects.find(p => p.id === key)?.color ? '' : 'bg-gray-400'; }
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.dot || 'bg-gray-400';
    if (groupBy === 'client') return key === 'sin_cliente' ? 'bg-gray-400' : 'bg-primary';
    return 'bg-gray-400';
  };

  const getGroupProjectColor = (key: string) => groupBy === 'project' ? projects.find(p => p.id === key)?.color : undefined;
  const getGroupBg = (key: string) => {
    if (groupBy === 'status') return STATUS_CONFIG[key as TaskStatus]?.bgColor || '';
    if (groupBy === 'priority') return PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.bg || '';
    return '';
  };

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    let targetStatus: TaskStatus | null = null;
    if (ALL_STATUSES.includes(overId as TaskStatus)) targetStatus = overId as TaskStatus;
    else if (overId.startsWith('stage-')) targetStatus = overId.replace('stage-', '') as TaskStatus;
    else { const overTask = allSmartTasks.find(t => t.id === overId); if (overTask) targetStatus = overTask.status; }
    if (targetStatus) {
      const currentTask = allSmartTasks.find(t => t.id === taskId);
      if (currentTask && currentTask.status !== targetStatus) {
        if (targetStatus === 'cancelled') {
          setCancellingTask(currentTask);
          return;
        }
        const updates: any = {
          status: targetStatus,
          completed_at: targetStatus === 'completed' ? new Date().toISOString() : null,
        };
        // If moving back to inbox, clear the due_date so it stays in Inbox as unscheduled
        if (targetStatus === 'inbox' && currentTask.due_date) {
          updates.due_date = null;
        }
        // If moving out of cancelled, clear cancellation metadata
        if (currentTask.status === 'cancelled') {
          updates.cancellation_reason = null;
          updates.cancellation_comment = null;
          updates.cancelled_at = null;
          updates.cancelled_by = null;
        }
        onUpdateTask(taskId, updates);
      }
    }
  };

  const handleConfirmCancelTask = async (taskId: string, reason: string, comment: string) => {
    const success = await onUpdateTask(taskId, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancellation_comment: comment || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: currentProfileId || null,
    });
    if (success) {
      try {
        await addDoc(collection(db, 'task_notes'), {
          task_id: taskId,
          created_by: currentProfileId || null,
          content: `🚫 Tarea descartada / rechazada.\nMotivo: ${reason}${comment ? `\nComentario: ${comment}` : ''}`,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error logging cancellation note:', e);
      }
      setCancellingTask(null);
      return true;
    }
    return false;
  };

  const handleReactivateTask = async (taskId: string) => {
    const ok = await onUpdateTask(taskId, {
      status: 'inbox',
      cancellation_reason: null,
      cancellation_comment: null,
      cancelled_at: null,
      cancelled_by: null,
    });
    if (ok) {
      try {
        await addDoc(collection(db, 'task_notes'), {
          task_id: taskId,
          created_by: currentProfileId || null,
          content: `🔄 Tarea reactivada y enviada a Inbox.`,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error logging reactivate note:', e);
      }
    }
  };

  const handleClientTagClick = (e: React.MouseEvent, clientIdOrName: string | null) => {
    e.stopPropagation();
    if (!clientIdOrName) return;
    const clientObj = clients.find(c => c.id === clientIdOrName || c.name === clientIdOrName || c.brand_name === clientIdOrName);
    setFilters(prev => ({ ...prev, clientId: prev.clientId === (clientObj ? clientObj.id : clientIdOrName) ? null : (clientObj ? clientObj.id : clientIdOrName) }));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full gap-4 min-h-0">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
          <StatCard icon={<Activity className="w-4 h-4" />} label="Activas" value={stats.total} accentColor="#3b82f6" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completadas hoy" value={stats.completedToday} accentColor="#10b981" />
          <StatCard icon={<Zap className="w-4 h-4" />} label="En riesgo" value={stats.atRisk} accentColor="#f59e0b" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Vencidas" value={stats.overdue} accentColor="#ef4444" />
          <StatCard icon={<ImageOff className="w-4 h-4" />} label="Contenido pendiente" value={stats.contentPending} accentColor="#8b5cf6" highlight={stats.contentPending > 0} />
        </div>

        {/* Filters */}
        <div className="shrink-0">
          <TaskFilters filters={filters} onFiltersChange={setFilters} projects={projects} clients={clients} />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          {viewMode === 'list' ? (
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} count={tabCounts.all}>Todas</TabButton>
              {ALL_STATUSES.map(s => (
                <TabButton key={s} active={activeTab === s} onClick={() => setActiveTab(s)} count={tabCounts[s] || 0} icon={STATUS_CONFIG[s].icon} color={STATUS_CONFIG[s].color}>
                  {STATUS_CONFIG[s].label}
                </TabButton>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="hidden md:inline">Arrastra tarjetas entre columnas para cambiar su etapa</span>
              </div>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">{filteredByFilters.length} tareas</Badge>
              {filteredContent.length > 0 && (
                <Badge className="h-5 px-1.5 text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0">
                  <ImageOff className="w-2.5 h-2.5 mr-1" />{filteredContent.length} contenido
                </Badge>
              )}
              {stats.cancelled > 0 && (
                <Button
                  variant={showCancelledInBoard ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[11px] gap-1 transition-all ml-1",
                    showCancelledInBoard
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      : "text-muted-foreground hover:text-rose-600 hover:border-rose-200"
                  )}
                  onClick={() => setShowCancelledInBoard(!showCancelledInBoard)}
                >
                  <Ban className="w-3 h-3" />
                  <span>{showCancelledInBoard ? 'Ocultar' : 'Ver'} descartadas ({stats.cancelled})</span>
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {onOpenNotion && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0 text-xs border-dashed hover:border-primary/40" onClick={onOpenNotion} title="Integración y sincronización con Notion">
                <div className="w-3.5 h-3.5 rounded bg-foreground text-background flex items-center justify-center font-bold text-[8px] leading-none shrink-0">N</div>
                <span>Notion</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </Button>
            )}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setViewMode('list')}>
                <List className="w-3.5 h-3.5" /><span className="hidden sm:inline">Lista</span>
              </Button>
              <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setViewMode('board')}>
                <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tablero</span>
              </Button>
            </div>
            {viewMode === 'list' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0 text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Agrupar: {groupBy === 'status' ? 'Etapa' : groupBy === 'project' ? 'Proyecto' : groupBy === 'client' ? 'Cliente' : 'Prioridad'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupBy('status')}><ListTodo className="w-4 h-4 mr-2" /> Etapa (Estado)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('project')}><LayoutGrid className="w-4 h-4 mr-2" /> Proyecto</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('client')}><Users className="w-4 h-4 mr-2 text-primary" /> Cliente</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('priority')}><AlertTriangle className="w-4 h-4 mr-2" /> Prioridad</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main View */}
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {Object.entries(groupedTasks).map(([key, groupTasks]) => {
              if (groupTasks.length === 0 && (groupBy !== 'status' || key === 'cancelled')) return null;
              const projectColor = getGroupProjectColor(key);
              const clientObj = groupBy === 'client' ? clients.find(c => c.id === key) : null;
              const isStageGroup = groupBy === 'status';
              return (
                <DroppableListGroup key={key} groupKey={key} isStage={isStageGroup} tasks={groupTasks} label={getGroupLabel(key)}
                  colorDot={getGroupColor(key)} projectColor={projectColor} clientObj={clientObj}
                  groupBg={activeTab === 'all' ? getGroupBg(key) : ''} projects={projects} profiles={profiles}
                  filters={filters} onUpdateTask={onUpdateTask} onOpenDetailModal={onOpenDetailModal}
                  onOpenEditModal={onOpenEditModal} onClientTagClick={handleClientTagClick}
                  onCancelTask={(t) => setCancellingTask(t)}
                  onReactivateTask={handleReactivateTask} />
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-muted-foreground">No hay tareas encontradas</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {Object.values(filters).some(Boolean) ? 'Prueba ajustando o limpiando los filtros' : 'Crea tu primera tarea con el botón "Nueva tarea"'}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Board Mode — 4 pipeline columns + 1 content column + optional cancelled column */
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
            <div className="flex gap-3 h-full min-w-[1020px]">
              {STATUSES.map((statusKey) => (
                <DroppableKanbanColumn
                  key={statusKey} statusKey={statusKey}
                  tasks={filteredRegular.filter(t => t.status === statusKey)}
                  projects={projects} profiles={profiles} filters={filters}
                  onOpenDetailModal={onOpenDetailModal} onUpdateTask={onUpdateTask} onClientTagClick={handleClientTagClick}
                  onCancelTask={(t) => setCancellingTask(t)}
                  onReactivateTask={handleReactivateTask}
                />
              ))}
              {/* Divider */}
              <div className="flex items-stretch shrink-0 py-2">
                <div className="w-px bg-gradient-to-b from-transparent via-border/70 to-transparent" />
              </div>
              {/* Content Column */}
              <ContentKanbanColumn
                tasks={filteredContent} projects={projects} profiles={profiles} filters={filters}
                onOpenDetailModal={onOpenDetailModal} onUpdateTask={onUpdateTask} onClientTagClick={handleClientTagClick}
              />
              {/* Cancelled Column (toggleable) */}
              {showCancelledInBoard && (
                <>
                  <div className="flex items-stretch shrink-0 py-2">
                    <div className="w-px bg-gradient-to-b from-transparent via-rose-200 dark:via-rose-900/40 to-transparent" />
                  </div>
                  <DroppableKanbanColumn
                    key="cancelled" statusKey="cancelled"
                    tasks={filteredByFilters.filter(t => t.status === 'cancelled')}
                    projects={projects} profiles={profiles} filters={filters}
                    onOpenDetailModal={onOpenDetailModal} onUpdateTask={onUpdateTask} onClientTagClick={handleClientTagClick}
                    onCancelTask={(t) => setCancellingTask(t)}
                    onReactivateTask={handleReactivateTask}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeDragTask && (
          <div className="w-72 bg-card border-2 border-primary/50 rounded-xl p-3.5 shadow-2xl scale-105 rotate-1 opacity-95 pointer-events-none cursor-grabbing">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-foreground line-clamp-2">{activeDragTask.title}</span>
              <PriorityDot priority={activeDragTask.priority} />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
              {activeDragTask.client && (
                <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  <Users className="w-2.5 h-2.5" />{activeDragTask.client}
                </span>
              )}
              {activeDragTask.due_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-2.5 h-2.5" />
                  {new Date(activeDragTask.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}
      </DragOverlay>

      <CancelTaskModal
        open={!!cancellingTask}
        onOpenChange={(open) => { if (!open) setCancellingTask(null); }}
        task={cancellingTask}
        onConfirmCancel={handleConfirmCancelTask}
      />
    </DndContext>
  );
}

// ─── Kanban Column (Pipeline) ──────────────────────────────────────────────

function DroppableKanbanColumn({ statusKey, tasks, projects, profiles, filters, onOpenDetailModal, onUpdateTask, onClientTagClick, onCancelTask, onReactivateTask }: {
  statusKey: TaskStatus; tasks: Task[]; projects: Project[]; profiles: Profile[];
  filters: TaskFiltersState; onOpenDetailModal?: (task: Task) => void;
  onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
  onCancelTask?: (task: Task) => void;
  onReactivateTask?: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  const config = STATUS_CONFIG[statusKey];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col flex-1 min-w-[200px] max-w-[270px] rounded-2xl border transition-all duration-200 min-h-0 overflow-hidden',
        isOver ? 'ring-2 ring-primary border-primary/60 shadow-lg shadow-primary/10' : 'border-border/50'
      )}
    >
      {/* Accent bar */}
      <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${config.accentColor}, ${config.accentColor}60)` }} />
      {/* Header */}
      <div className={cn('px-3 pt-3 pb-2.5 shrink-0 border-b border-border/30', config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.accentColor}18` }}>
              <span style={{ color: config.accentColor }}>{config.icon}</span>
            </div>
            <div>
              <p className="font-bold text-[11px] text-foreground uppercase tracking-wider leading-none">{config.label}</p>
              <p className="text-[9px] text-muted-foreground/70 font-medium mt-0.5">{config.sublabel}</p>
            </div>
          </div>
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-bold tabular-nums" style={{ color: config.accentColor }}>
            {tasks.length}
          </Badge>
        </div>
      </div>
      {/* Cards */}
      <div className={cn('flex-1 overflow-y-auto p-2 space-y-2', config.bgColor)}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableKanbanCard key={task.id} task={task} projects={projects} profiles={profiles}
              filters={filters} onOpenDetailModal={onOpenDetailModal} onUpdateTask={onUpdateTask} onClientTagClick={onClientTagClick}
              onCancelTask={onCancelTask}
              onReactivateTask={onReactivateTask} />
          ))}
          {tasks.length === 0 && (
            <div className={cn('flex items-center justify-center h-24 border-2 border-dashed rounded-xl text-center transition-all duration-200',
              isOver ? 'border-primary/60 bg-primary/5' : 'border-border/40 opacity-50')}>
              <p className="text-[10px] text-muted-foreground font-medium">{isOver ? '⬇ Soltar aquí' : 'Sin tareas'}</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Content Column (Notion / Unpublished) ────────────────────────────────

function ContentKanbanColumn({ tasks, projects, profiles, filters, onOpenDetailModal, onUpdateTask, onClientTagClick }: {
  tasks: Task[]; projects: Project[]; profiles: Profile[];
  filters: TaskFiltersState; onOpenDetailModal?: (task: Task) => void;
  onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
}) {
  const groupedByClient = useMemo(() => {
    const clientMap: Record<string, Task[]> = {};
    tasks.forEach(t => {
      const key = t.client || t.client_id || '__none__';
      if (!clientMap[key]) clientMap[key] = [];
      clientMap[key].push(t);
    });
    return Object.entries(clientMap).map(([key, clientTasks]) => ({
      label: key === '__none__' ? 'Sin cliente' : clientTasks[0].client || key,
      tasks: clientTasks,
    }));
  }, [tasks]);

  return (
    <div className="flex flex-col flex-1 min-w-[220px] max-w-[290px] rounded-2xl border-2 border-violet-200 dark:border-violet-800/50 min-h-0 overflow-hidden shadow-sm shadow-violet-100/50 dark:shadow-violet-900/10">
      {/* Gradient accent bar */}
      <div className="h-1 w-full shrink-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 shrink-0 bg-violet-50/90 dark:bg-violet-950/50 border-b border-violet-100 dark:border-violet-900/40">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/60 flex items-center justify-center">
              <ImageOff className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-violet-700 dark:text-violet-300 uppercase tracking-wider leading-none">Contenido</p>
              <p className="text-[9px] text-violet-500/70 dark:text-violet-400/50 font-semibold tracking-widest uppercase mt-0.5">No Publicado</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <Badge className="h-5 px-1.5 text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 tabular-nums">
              {tasks.length}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-foreground/75 text-background flex items-center justify-center font-bold text-[7px] leading-none shrink-0">N</div>
          <span className="text-[9px] text-muted-foreground font-medium">Sincronizado desde Notion</span>
        </div>
      </div>
      {/* Cards grouped by client */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-violet-50/40 dark:bg-violet-950/20">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-violet-200 dark:border-violet-800/40 rounded-xl text-center p-4 mt-2">
            <ImageOff className="w-5 h-5 text-violet-300 dark:text-violet-700 mb-2" />
            <p className="text-[10px] text-violet-400 dark:text-violet-500 font-medium">No hay contenido pendiente</p>
            <p className="text-[9px] text-violet-300 dark:text-violet-600 mt-0.5">Sincroniza desde Notion</p>
          </div>
        ) : (
          groupedByClient.map(group => (
            <div key={group.label} className="space-y-1.5">
              {groupedByClient.length > 1 && (
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50" />
                  <span className="text-[10px] font-semibold text-violet-500/70 dark:text-violet-400/50 uppercase tracking-wider truncate">{group.label}</span>
                  <div className="flex-1 h-px bg-violet-200/50 dark:bg-violet-800/30" />
                  <span className="text-[9px] text-violet-400/50">{group.tasks.length}</span>
                </div>
              )}
              {group.tasks.map(task => (
                <ContentKanbanCard key={task.id} task={task} projects={projects} profiles={profiles}
                  onOpenDetailModal={onOpenDetailModal} onUpdateTask={onUpdateTask} onClientTagClick={onClientTagClick} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────

function ContentKanbanCard({ task, projects, profiles, onOpenDetailModal, onUpdateTask, onClientTagClick }: {
  task: Task; projects: Project[]; profiles: Profile[];
  onOpenDetailModal?: (task: Task) => void;
  onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
}) {
  const project = projects.find(p => p.id === task.project_id);
  const assignee = profiles.find(p => p.id === task.assigned_to);
  const isDueToday = task.due_date ? isToday(parseISO(task.due_date)) : false;
  const isOverdue = task.due_date ? (isPast(parseISO(task.due_date)) && !isDueToday && task.status !== 'completed') : false;

  return (
    <div
      onClick={() => onOpenDetailModal?.(task)}
      className="group relative bg-white dark:bg-card border border-violet-100 dark:border-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 rounded-xl p-3 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
    >
      {/* Priority bar */}
      <div className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
        task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400')} />
      <div className="pl-2 space-y-2">
        <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {project && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold truncate max-w-[90px]"
              style={{ backgroundColor: `${project.color}18`, color: project.color }}>
              {project.name}
            </span>
          )}
          {task.client && (
            <button onClick={(e) => onClientTagClick(e, task.client_id || task.client)}
              className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 font-semibold hover:bg-violet-200 transition-colors truncate max-w-[90px]">
              <Users className="w-2 h-2 shrink-0" />
              <span className="truncate">{task.client}</span>
            </button>
          )}
          <span className="text-[8px] px-1 py-0.5 rounded border border-foreground/10 font-bold text-foreground/50 shrink-0">N</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-violet-100/70 dark:border-violet-900/30">
          {task.due_date ? (
            <span className={cn('flex items-center gap-1 text-[10px] font-medium',
              isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-500 font-semibold' : 'text-muted-foreground')}>
              <CalendarDays className="w-2.5 h-2.5" />
              {isDueToday ? (
                <span className="flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[8px] font-bold">Hoy</span>
                  <span>{new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}</span>
                </span>
              ) : (
                new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })
              )}
            </span>
          ) : <span className="text-[10px] text-muted-foreground/50">Sin fecha</span>}
          <div className="flex items-center gap-1">
            <PriorityDot priority={task.priority} />
            {assignee && (
              <div title={assignee.display_name}
                className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-[8px] font-bold text-violet-700 dark:text-violet-200">
                {assignee.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Kanban Card (Regular) ──────────────────────────────────────

function SortableKanbanCard({ task, projects, profiles, filters, onOpenDetailModal, onUpdateTask, onClientTagClick, onCancelTask, onReactivateTask }: {
  task: Task; projects: Project[]; profiles: Profile[];
  filters: TaskFiltersState; onOpenDetailModal?: (task: Task) => void;
  onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
  onCancelTask?: (task: Task) => void;
  onReactivateTask?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const project = projects.find(p => p.id === task.project_id);
  const assignee = profiles.find(p => p.id === task.assigned_to);

  const isDueToday = task.due_date ? isToday(parseISO(task.due_date)) : false;
  const isOverdue = task.due_date ? (isPast(parseISO(task.due_date)) && !isDueToday && task.status !== 'completed' && task.status !== 'cancelled') : false;

  const advanceTaskStatus = (t: Task) => {
    const nextMap: Record<TaskStatus, TaskStatus> = { inbox: 'week', week: 'completed', risk: 'completed', completed: 'inbox', cancelled: 'inbox' };
    onUpdateTask(t.id, { status: nextMap[t.status], completed_at: nextMap[t.status] === 'completed' ? new Date().toISOString() : null });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onOpenDetailModal?.(task)}
      className={cn('group relative bg-card hover:bg-accent/30 border border-border/60 hover:border-primary/40 rounded-xl p-3 shadow-2xs hover:shadow-sm transition-all cursor-grab active:cursor-grabbing space-y-2 hover:-translate-y-0.5',
        isDragging && 'opacity-30 border-dashed border-primary ring-2 ring-primary/20')}>
      <div className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
        task.status === 'cancelled' ? 'bg-rose-400' :
        task.priority === 'high' && task.status !== 'completed' ? 'bg-red-400' :
        task.priority === 'medium' && task.status !== 'completed' ? 'bg-yellow-400' :
        task.priority === 'low' && task.status !== 'completed' ? 'bg-green-400' : 'bg-transparent')} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <span className={cn('text-[12px] font-semibold leading-snug', (task.status === 'completed' || task.status === 'cancelled') && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
        <PriorityDot priority={task.priority} />
      </div>

      {task.status === 'cancelled' && (
        <div className="pl-2 space-y-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/40">
            <Ban className="w-2.5 h-2.5 shrink-0" />
            {task.cancellation_reason || 'Descartada'}
          </span>
          {task.cancellation_comment && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-1">
              "{task.cancellation_comment}"
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pl-2">
        {project && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold truncate max-w-[120px]"
            style={{ backgroundColor: `${project.color}15`, color: project.color }}>
            {project.name}
          </span>
        )}
        {task.client && (
          <button onClick={(e) => onClientTagClick(e, task.client_id || task.client)}
            className={cn('flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full transition-all truncate max-w-[110px]',
              filters.clientId === task.client_id ? 'bg-primary text-primary-foreground font-semibold' : 'bg-primary/10 text-primary hover:bg-primary/20 font-medium')}
            title="Filtrar por este cliente">
            <Users className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{task.client}</span>
          </button>
        )}
        {task.notion_page_id && (
          <span className="text-[8px] px-1 py-0.5 rounded border border-foreground/15 font-bold text-muted-foreground/70 shrink-0" title="Sincronizado desde Notion">
            N
          </span>
        )}
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground pl-2">
        <div>
          {task.due_date ? (
            <span className={cn('flex items-center gap-1',
              isOverdue ? 'text-red-500 font-semibold' :
              isDueToday ? 'text-amber-500 font-semibold' : 'text-muted-foreground')}>
              <CalendarDays className="w-2.5 h-2.5" />
              {isDueToday ? (
                <span className="flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[8px] font-bold">Hoy</span>
                  <span>{new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}</span>
                </span>
              ) : (
                new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })
              )}
            </span>
          ) : <span className="text-[10px] text-muted-foreground/60">Sin fecha</span>}
        </div>
        <div className="flex items-center gap-1">
          {assignee && (
            <div title={assignee.display_name} className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
              {assignee.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          {task.status === 'cancelled' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 gap-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (onReactivateTask) {
                  onReactivateTask(task.id);
                } else {
                  onUpdateTask(task.id, {
                    status: 'inbox',
                    cancellation_reason: null,
                    cancellation_comment: null,
                    cancelled_at: null,
                    cancelled_by: null,
                  });
                }
              }}
              title="Reactivar y mover a Inbox"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reactivar</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelTask?.(task);
                }}
                title="Descartar / Cancelar tarea"
              >
                <Ban className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); advanceTaskStatus(task); }}
                title="Avanzar etapa"
              >
                <ArrowRight className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List Mode Droppable Group ────────────────────────────────────────────

function DroppableListGroup({ groupKey, isStage, tasks, label, colorDot, projectColor, clientObj, groupBg, projects, profiles, filters, onUpdateTask, onOpenDetailModal, onOpenEditModal, onClientTagClick, onCancelTask, onReactivateTask }: {
  groupKey: string; isStage: boolean; tasks: Task[]; label: string; colorDot: string; projectColor?: string;
  clientObj?: Client | null; groupBg: string; projects: Project[]; profiles: Profile[];
  filters: TaskFiltersState; onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onOpenDetailModal?: (task: Task) => void; onOpenEditModal?: (task: Task) => void;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
  onCancelTask?: (task: Task) => void;
  onReactivateTask?: (taskId: string) => void;
}) {
  const droppableId = isStage ? `stage-${groupKey}` : groupKey;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div ref={setNodeRef} className={cn("space-y-1.5 p-1 rounded-xl transition-all duration-200", isStage && isOver && "ring-2 ring-primary/40 bg-primary/5 shadow-xs")}>
      <div className="flex items-center gap-2 py-1 px-1">
        {clientObj ? (
          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
            {(clientObj.brand_name || clientObj.name).charAt(0).toUpperCase()}
          </div>
        ) : projectColor ? (
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} />
        ) : (
          <div className={cn('w-2.5 h-2.5 rounded-full', colorDot)} />
        )}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-semibold ml-0.5">{tasks.length}</Badge>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className={cn('rounded-lg overflow-hidden border border-border/40 transition-colors', groupBg, isOver && isStage && "border-primary/50 bg-primary/5")}>
          {tasks.map(task => (
            <SortableListCard key={task.id} task={task} projects={projects} profiles={profiles} filters={filters}
              onUpdateTask={onUpdateTask} onOpenDetailModal={onOpenDetailModal} onOpenEditModal={onOpenEditModal} onClientTagClick={onClientTagClick}
              onCancelTask={onCancelTask}
              onReactivateTask={onReactivateTask} />
          ))}
          {tasks.length === 0 && (
            <div className="py-5 text-center text-xs text-muted-foreground/70">
              {isOver && isStage ? 'Soltar aquí para mover a esta etapa' : 'Sin tareas en esta etapa'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Sortable List Card ────────────────────────────────────────────────────

function SortableListCard({ task, projects, profiles, filters, onUpdateTask, onOpenDetailModal, onOpenEditModal, onClientTagClick, onCancelTask, onReactivateTask }: {
  task: Task; projects: Project[]; profiles: Profile[];
  filters: TaskFiltersState; onUpdateTask: (id: string, data: any) => Promise<boolean>;
  onOpenDetailModal?: (task: Task) => void; onOpenEditModal?: (task: Task) => void;
  onClientTagClick: (e: React.MouseEvent, clientIdOrName: string | null) => void;
  onCancelTask?: (task: Task) => void;
  onReactivateTask?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const project = projects.find(p => p.id === task.project_id);
  const assignee = profiles.find(p => p.id === task.assigned_to);

  return (
    <div ref={setNodeRef} style={style}
      className={cn("group relative border-b last:border-b-0 border-border/40 bg-card hover:bg-accent/30 transition-colors cursor-pointer", isDragging && "opacity-30 border-dashed border-primary")}
      onClick={() => onOpenDetailModal?.(task)}>
      <div className="flex items-center gap-2.5 px-3 py-3">
        <button {...attributes} {...listeners}
          className="p-1 -ml-1 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()} title="Arrastrar para mover de etapa">
          <GripVertical className="w-4 h-4" />
        </button>
        {task.status === 'cancelled' ? (
          <div
            className="shrink-0 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center"
            title="Tarea descartada"
          >
            <Ban className="w-3 h-3" />
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status === 'completed' ? 'inbox' : 'completed', completed_at: task.status === 'completed' ? null : new Date().toISOString() }); }}
            className={cn('shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110',
              task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/40 hover:border-primary')}>
            {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium truncate', (task.status === 'completed' || task.status === 'cancelled') && 'line-through text-muted-foreground')}>{task.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.status === 'cancelled' && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50">
                <Ban className="w-2.5 h-2.5 shrink-0" />
                {task.cancellation_reason || 'Descartada'}
                {task.cancellation_comment && (
                  <span className="italic text-muted-foreground ml-1 font-normal truncate max-w-[200px]">
                    — "{task.cancellation_comment}"
                  </span>
                )}
              </span>
            )}
            {project && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}
              </span>
            )}
            {task.client && (
              <button onClick={(e) => onClientTagClick(e, task.client_id || task.client)}
                className={cn('flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all',
                  filters.clientId === task.client_id ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'bg-primary/10 text-primary hover:bg-primary/20 font-medium')}
                title="Filtrar por este cliente">
                <Users className="w-2.5 h-2.5" />{task.client}
              </button>
            )}
            {task.notion_page_id && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-foreground/10 text-foreground shrink-0 border border-foreground/10" title="Sincronizado desde Notion">
                <span className="font-bold">N</span> Notion
              </span>
            )}
            {task.due_date && (() => {
              const isDueToday = isToday(parseISO(task.due_date));
              const isOverdue = isPast(parseISO(task.due_date)) && !isDueToday && task.status !== 'completed' && task.status !== 'cancelled';
              return (
                <span className={cn('text-[11px] flex items-center gap-1',
                  isOverdue ? 'text-red-500 font-medium' :
                  isDueToday ? 'text-amber-500 font-medium' : 'text-muted-foreground')}>
                  <CalendarDays className="w-2.5 h-2.5" />
                  {isDueToday ? (
                    <span className="flex items-center gap-1">
                      <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[8px] font-bold">Hoy</span>
                      <span>{new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}</span>
                    </span>
                  ) : (
                    new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                  )}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityDot priority={task.priority} />
          {assignee && (
            <div title={assignee.display_name} className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {assignee.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          {task.status === 'cancelled' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                if (onReactivateTask) {
                  onReactivateTask(task.id);
                } else {
                  onUpdateTask(task.id, {
                    status: 'inbox',
                    cancellation_reason: null,
                    cancellation_comment: null,
                    cancelled_at: null,
                    cancelled_by: null,
                  });
                }
              }}
              title="Reactivar y mover a Inbox"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reactivar</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCancelTask?.(task);
              }}
              title="Descartar tarea"
            >
              <Ban className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onOpenEditModal?.(task); }} title="Editar tarea">
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5 rounded-full',
        task.status === 'cancelled' ? 'bg-rose-400' :
        task.priority === 'high' && task.status !== 'completed' ? 'bg-red-400' :
        task.priority === 'medium' && task.status !== 'completed' ? 'bg-yellow-400' :
        task.priority === 'low' && task.status !== 'completed' ? 'bg-green-400' : 'bg-transparent')} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accentColor, highlight = false }: {
  icon: React.ReactNode; label: string; value: number; accentColor: string; highlight?: boolean;
}) {
  return (
    <div className={cn('relative rounded-xl p-3 border overflow-hidden flex items-center gap-3 transition-all',
      highlight && value > 0 ? 'border-violet-200 dark:border-violet-800/50 shadow-sm' : 'border-border/50')}
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 5%, transparent), transparent)` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}14`, color: accentColor }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-none tabular-nums" style={{ color: accentColor }}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-medium">{label}</p>
      </div>
      {highlight && value > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
    </div>
  );
}

function TabButton({ active, onClick, count, icon, color, children }: {
  active: boolean; onClick: () => void; count: number; icon?: React.ReactNode; color?: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
      {icon && <span className={active ? 'text-primary-foreground' : color}>{icon}</span>}
      {children}
      <Badge variant="secondary" className={cn('h-4 px-1 text-[10px] font-bold ml-0.5', active ? 'bg-white/20 text-white' : '')}>{count}</Badge>
    </button>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors = { high: 'bg-red-400', medium: 'bg-yellow-400', low: 'bg-green-400' };
  return <div title={priority} className={cn('w-2 h-2 rounded-full shrink-0', colors[priority as keyof typeof colors] || 'bg-gray-300')} />;
}
