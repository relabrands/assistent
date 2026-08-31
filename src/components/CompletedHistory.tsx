import { useState } from 'react';
import { Task, Profile, Project } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CheckCircle2, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CompletedHistoryProps {
  tasks: Task[];
  profiles: Profile[];
  projects: Project[];
}

type TimeFilter = 'week' | 'month' | 'all';

export function CompletedHistory({ tasks, profiles, projects }: CompletedHistoryProps) {
  const [filter, setFilter] = useState<TimeFilter>('week');

  const now = new Date();
  
  const filteredTasks = tasks.filter((task) => {
    if (!task.completed_at) return false;
    
    const completedDate = new Date(task.completed_at);
    
    if (filter === 'week') {
      return isWithinInterval(completedDate, {
        start: startOfWeek(now, { locale: es }),
        end: endOfWeek(now, { locale: es }),
      });
    }
    
    if (filter === 'month') {
      return isWithinInterval(completedDate, {
        start: startOfMonth(now),
        end: endOfMonth(now),
      });
    }
    
    return true;
  });

  // Group by date
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.completed_at!), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="text-sm font-semibold text-foreground">Historial</h2>
          <span className="text-xs text-muted-foreground">
            ({filteredTasks.length})
          </span>
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant={filter === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('week')}
            className="text-xs h-7 px-2"
          >
            Semana
          </Button>
          <Button
            variant={filter === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('month')}
            className="text-xs h-7 px-2"
          >
            Mes
          </Button>
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs h-7 px-2"
          >
            Todo
          </Button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin tareas completadas en este periodo
        </p>
      ) : (
        <ScrollArea className="h-[200px] -mx-1">
          <div className="space-y-4 px-1">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  {groupedTasks[dateKey].map((task) => {
                    const project = projects.find(p => p.id === task.project_id);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-1 min-w-0"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground line-through truncate flex-1 min-w-0">
                          {task.title}
                        </span>
                        {project && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                            title={project.name}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
