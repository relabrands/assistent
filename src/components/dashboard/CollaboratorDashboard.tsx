import { Profile, Project, Task } from '@/types/database';
import { ContentItem } from '@/types/content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  CalendarDays,
  ListTodo,
  ArrowRight
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface CollaboratorDashboardProps {
  profile: Profile;
  tasks: Task[];
  projects: Project[];
  profiles: Profile[];
  contentItems: ContentItem[];
  onTaskClick: (task: Task) => void;
}

export function CollaboratorDashboard({
  profile,
  tasks,
  projects,
  profiles,
  contentItems,
  onTaskClick,
}: CollaboratorDashboardProps) {
  // My assigned tasks
  const myTasks = tasks.filter(t => t.assigned_to === profile.id && t.status !== 'completed');
  const myCompletedTasks = tasks.filter(t => t.assigned_to === profile.id && t.status === 'completed');
  const myRiskTasks = myTasks.filter(t => t.status === 'risk');
  
  // My assigned content
  const myContent = contentItems.filter(c => c.assigned_to === profile.id);
  const myPendingContent = myContent.filter(c => 
    c.status === 'draft' || c.status === 'requires_changes'
  );

  // Tasks due soon
  const today = new Date();
  const tasksDueSoon = myTasks
    .filter(t => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const getDueDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return { label: 'Vencida', variant: 'destructive' as const };
    if (isToday(date)) return { label: 'Hoy', variant: 'default' as const };
    if (isTomorrow(date)) return { label: 'Mañana', variant: 'secondary' as const };
    return { label: format(date, "d MMM", { locale: es }), variant: 'outline' as const };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mi Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Tu trabajo de hoy, {profile.display_name}
          </p>
        </div>
        <Badge variant="secondary">
          Colaborador
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <ListTodo className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Mis tareas</span>
            </div>
            <p className="text-2xl font-bold">{myTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completadas</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{myCompletedTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">En riesgo</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{myRiskTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Contenidos</span>
            </div>
            <p className="text-2xl font-bold">{myContent.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks Due Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Próximas fechas límite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksDueSoon.length > 0 ? (
              <div className="space-y-2">
                {tasksDueSoon.map((task) => {
                  const project = projects.find(p => p.id === task.project_id);
                  const dueInfo = getDueDateLabel(task.due_date!);
                  
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className={`w-3 h-3 rounded-full shrink-0`} style={{
                        backgroundColor: project?.color || '#6366f1'
                      }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {project && (
                          <p className="text-xs text-muted-foreground">{project.name}</p>
                        )}
                      </div>
                      <Badge variant={dueInfo.variant} className="shrink-0 text-xs">
                        {dueInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <CalendarDays className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tienes tareas con fecha límite próxima
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Pending Content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contenidos pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myPendingContent.length > 0 ? (
              <div className="space-y-2">
                {myPendingContent.slice(0, 5).map((content) => (
                  <div 
                    key={content.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{content.title}</p>
                      {content.scheduled_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(content.scheduled_date), "d 'de' MMMM", { locale: es })}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={content.status === 'requires_changes' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'text-xs'
                      }
                    >
                      {content.status === 'requires_changes' ? 'Cambios' : content.platform}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tienes contenidos pendientes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At Risk Tasks */}
      {myRiskTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Tareas en riesgo ({myRiskTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRiskTasks.map((task) => {
                const project = projects.find(p => p.id === task.project_id);
                
                return (
                  <div 
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => onTaskClick(task)}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {project && (
                        <p className="text-xs text-muted-foreground">{project.name}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
