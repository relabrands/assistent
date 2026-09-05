import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContentItem, CONTENT_STATUS_COLORS, CONTENT_TYPE_ICONS, PLATFORM_COLORS } from '@/types/content';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentCalendarProps {
  contentItems: ContentItem[];
  profiles: Profile[];
  onContentClick: (content: ContentItem) => void;
  onAddContent?: () => void;
  isClientView?: boolean;
}

export function ContentCalendar({
  contentItems,
  profiles,
  onContentClick,
  onAddContent,
  isClientView = false,
}: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getContentForDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return contentItems.filter(item => {
      if (!item.scheduled_date) return false;
      return item.scheduled_date.slice(0, 10) === dayStr;
    });
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-lg capitalize ml-2">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h3>
        </div>
        {!isClientView && onAddContent && (
          <Button size="sm" onClick={onAddContent}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayContent = getContentForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[100px] p-1 border-b border-r last:border-r-0',
                  !isCurrentMonth && 'bg-muted/30',
                  isToday && 'bg-primary/5'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday && 'bg-primary text-primary-foreground',
                  !isCurrentMonth && 'text-muted-foreground'
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayContent.slice(0, 3).map((content) => (
                    <button
                      key={content.id}
                      onClick={() => onContentClick(content)}
                      className={cn(
                        'w-full text-left text-xs p-1 rounded truncate transition-colors',
                        CONTENT_STATUS_COLORS[content.status].bg,
                        CONTENT_STATUS_COLORS[content.status].text,
                        'hover:opacity-80'
                      )}
                    >
                      <span className="mr-1">{CONTENT_TYPE_ICONS[content.content_type]}</span>
                      {content.title}
                    </button>
                  ))}
                  {dayContent.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayContent.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(CONTENT_STATUS_COLORS).slice(0, 5).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', colors.bg)} />
            <span className="text-muted-foreground capitalize">
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
