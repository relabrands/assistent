import { useState, useMemo } from 'react';
import { Task, Profile, Project, LIFE_AREA_LABELS, LIFE_AREA_COLORS } from '@/types/database';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';

interface CalendarViewProps {
  tasks: Task[];
  profiles: Profile[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
}

type ViewMode = 'day' | 'week';

const priorityColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

export function CalendarView({ tasks, profiles, projects, onTaskClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Filter tasks that have due_date and are not completed
  const calendarTasks = useMemo(() => {
    return tasks.filter(task => task.due_date && task.status !== 'completed');
  }, [tasks]);

  // Get tasks for a specific day
  const getTasksForDay = (date: Date) => {
    return calendarTasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    });
  };

  // Get days for current week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Navigate functions
  const goToToday = () => setSelectedDate(new Date());
  
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, -1));
    } else {
      setSelectedDate(addDays(selectedDate, -7));
    }
  };
  
  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 7));
    }
  };

  const renderTask = (task: Task) => {
    const project = projects.find(p => p.id === task.project_id);
    const lifeAreaInfo = task.life_area ? LIFE_AREA_COLORS[task.life_area] : null;
    
    return (
      <div
        key={task.id}
        onClick={() => onTaskClick(task)}
        className="p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
      >
        <div className="flex items-start gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', priorityColors[task.priority])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {lifeAreaInfo && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  lifeAreaInfo.bg,
                  lifeAreaInfo.text
                )}>
                  {lifeAreaInfo.icon} {LIFE_AREA_LABELS[task.life_area!]}
                </span>
              )}
              {project && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${project.color}20`,
                    color: project.color,
                  }}
                >
                  {project.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h3 className="text-base sm:text-lg font-semibold order-first sm:order-none">
          {viewMode === 'day' 
            ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
            : `${format(weekDays[0], 'd MMM', { locale: es })} - ${format(weekDays[6], 'd MMM yyyy', { locale: es })}`
          }
        </h3>
        
        <div className="flex items-center gap-1">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('day')}
            className="text-xs sm:text-sm"
          >
            <CalendarIcon className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Día</span>
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
            className="text-xs sm:text-sm"
          >
            <LayoutGrid className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Semana</span>
          </Button>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <div className="hidden md:block">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              locale={es}
              modifiers={{
                hasTasks: (date) => getTasksForDay(date).length > 0,
              }}
              modifiersClassNames={{
                hasTasks: 'bg-primary/10 font-semibold',
              }}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-muted-foreground text-sm sm:text-base">
                Tareas para {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {getTasksForDay(selectedDate).length} tareas
              </Badge>
            </div>
            
            <ScrollArea className="h-[300px] sm:h-[400px] md:h-[500px]">
              <div className="space-y-2 pr-4">
                {getTasksForDay(selectedDate).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                    <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">No hay tareas para este día</p>
                  </div>
                ) : (
                  getTasksForDay(selectedDate).map(renderTask)
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[600px] sm:min-w-[700px]">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    'min-h-[120px] sm:min-h-[150px] rounded-lg border p-1.5 sm:p-2',
                    isToday && 'border-primary bg-primary/5'
                  )}
                >
                  <div className={cn(
                    'text-center mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b',
                    isToday && 'text-primary font-semibold'
                  )}>
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className={cn(
                      'text-sm sm:text-lg',
                      isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mx-auto text-xs sm:text-base'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[100px] sm:h-[140px]">
                    <div className="space-y-1">
                      {dayTasks.map((task) => {
                        const project = projects.find(p => p.id === task.project_id);
                        return (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className="p-1 sm:p-1.5 rounded text-[10px] sm:text-xs bg-card hover:bg-accent/50 cursor-pointer border truncate"
                          >
                            <div className="flex items-center gap-1">
                              <div className={cn('w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0', priorityColors[task.priority])} />
                              <span className="truncate">{task.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
