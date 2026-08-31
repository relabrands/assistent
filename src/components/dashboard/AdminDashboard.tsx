import { useMemo } from 'react';
import { Profile, Project, Task } from '@/types/database';
import { ContentItem } from '@/types/content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  Users, 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  TrendingUp,
  CalendarDays,
  BarChart3
} from 'lucide-react';
import { format, subDays, startOfDay, isWithinInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminDashboardProps {
  profile: Profile;
  tasks: Task[];
  projects: Project[];
  profiles: Profile[];
  contentItems: ContentItem[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export function AdminDashboard({
  profile,
  tasks,
  projects,
  profiles,
  contentItems,
}: AdminDashboardProps) {
  // Task stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const riskTasks = tasks.filter(t => t.status === 'risk').length;
  const completionRate = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100) 
    : 0;

  // Content stats
  const pendingContent = contentItems.filter(c => 
    c.status === 'pending_review' || c.status === 'in_review'
  );
  const approvedContent = contentItems.filter(c => c.status === 'approved').length;
  const scheduledContent = contentItems.filter(c => c.status === 'scheduled').length;

  // Weekly productivity data - last 7 days
  const weeklyData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const completed = tasks.filter(t => {
        if (!t.completed_at) return false;
        const completedDate = parseISO(t.completed_at);
        return isWithinInterval(completedDate, { start: dayStart, end: dayEnd });
      }).length;

      const created = tasks.filter(t => {
        const createdDate = parseISO(t.created_at);
        return isWithinInterval(createdDate, { start: dayStart, end: dayEnd });
      }).length;

      data.push({
        day: format(date, 'EEE', { locale: es }),
        completadas: completed,
        creadas: created,
      });
    }
    
    return data;
  }, [tasks]);

  // Tasks by status for pie chart
  const tasksByStatus = useMemo(() => {
    return [
      { name: 'Completadas', value: completedTasks, color: '#10b981' },
      { name: 'Esta semana', value: tasks.filter(t => t.status === 'week').length, color: '#6366f1' },
      { name: 'Inbox', value: tasks.filter(t => t.status === 'inbox').length, color: '#8b5cf6' },
      { name: 'En riesgo', value: riskTasks, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [tasks, completedTasks, riskTasks]);

  // Tasks by project
  const tasksByProject = useMemo(() => {
    const projectMap = new Map<string, { name: string; count: number; color: string }>();
    
    tasks.forEach(task => {
      if (task.project_id) {
        const project = projects.find(p => p.id === task.project_id);
        if (project) {
          const existing = projectMap.get(project.id);
          if (existing) {
            existing.count++;
          } else {
            projectMap.set(project.id, {
              name: project.name.slice(0, 15),
              count: 1,
              color: project.color,
            });
          }
        }
      }
    });

    return Array.from(projectMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tasks, projects]);

  // Content by status
  const contentByStatus = useMemo(() => {
    return [
      { name: 'Borrador', value: contentItems.filter(c => c.status === 'draft').length },
      { name: 'Pendiente', value: contentItems.filter(c => c.status === 'pending_review' || c.status === 'in_review').length },
      { name: 'Aprobado', value: approvedContent },
      { name: 'Programado', value: scheduledContent },
      { name: 'Publicado', value: contentItems.filter(c => c.status === 'published').length },
    ].filter(item => item.value > 0);
  }, [contentItems, approvedContent, scheduledContent]);

  // Recent activity - tasks due this week
  const today = new Date();
  const thisWeekTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Panel de Administrador</h2>
          <p className="text-sm text-muted-foreground">
            Resumen general de tu workspace
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Admin
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Proyectos</span>
            </div>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Miembros</span>
            </div>
            <p className="text-2xl font-bold">{profiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completadas</span>
            </div>
            <p className="text-2xl font-bold">{completedTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">En riesgo</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{riskTasks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Productivity Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Productividad Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="completadas" fill="#10b981" radius={[4, 4, 0, 0]} name="Completadas" />
                <Bar dataKey="creadas" fill="#6366f1" radius={[4, 4, 0, 0]} name="Creadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Completadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-xs text-muted-foreground">Creadas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Distribución de Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksByStatus.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-[140px] w-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {tasksByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {tasksByStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay tareas todavía
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Project */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Tareas por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksByProject.length > 0 ? (
              <div className="space-y-3">
                {tasksByProject.map((project, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm truncate">{project.name}</span>
                      </div>
                      <span className="text-sm font-medium">{project.count}</span>
                    </div>
                    <Progress 
                      value={(project.count / Math.max(...tasksByProject.map(p => p.count))) * 100} 
                      className="h-1.5"
                      style={{ 
                        '--progress-background': project.color 
                      } as React.CSSProperties}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay tareas asignadas a proyectos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Stats */}
      {contentItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Estado de Contenidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={contentByStatus} 
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Próximas Fechas Límite
          </CardTitle>
        </CardHeader>
        <CardContent>
          {thisWeekTasks.length > 0 ? (
            <div className="space-y-2">
              {thisWeekTasks.map((task) => {
                const project = projects.find(p => p.id === task.project_id);
                const dueDate = new Date(task.due_date!);
                const isOverdue = dueDate < today;
                
                return (
                  <div 
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isOverdue ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {project && (
                        <p className="text-xs text-muted-foreground">{project.name}</p>
                      )}
                    </div>
                    <Badge 
                      variant={isOverdue ? 'destructive' : 'secondary'}
                      className="shrink-0 text-xs"
                    >
                      {format(dueDate, "d MMM", { locale: es })}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <CalendarDays className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay tareas con fecha límite esta semana
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
