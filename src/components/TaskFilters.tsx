import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Project, LifeArea, TaskPriority, LIFE_AREA_LABELS, LIFE_AREA_COLORS } from '@/types/database';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface TaskFiltersState {
  search: string;
  projectId: string | null;
  lifeArea: LifeArea | null;
  priority: TaskPriority | null;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  projects: Project[];
}

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-700' },
];

const lifeAreas: LifeArea[] = ['trabajo', 'personal', 'salud', 'aprendizaje', 'finanzas'];

export function TaskFilters({ filters, onFiltersChange, projects }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeFiltersCount = [
    filters.projectId,
    filters.lifeArea,
    filters.priority,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      projectId: null,
      lifeArea: null,
      priority: null,
    });
  };

  const hasActiveFilters = filters.search || activeFiltersCount > 0;

  return (
    <div className="space-y-3">
      {/* Search and toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Buscar tareas..."
            className="pl-9 h-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-2 -right-2 bg-primary text-primary-foreground"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Filter dropdowns */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/30">
            {/* Project filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
              <Select 
                value={filters.projectId || 'all'} 
                onValueChange={(v) => onFiltersChange({ ...filters, projectId: v === 'all' ? null : v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Life area filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Área de vida</label>
              <Select 
                value={filters.lifeArea || 'all'} 
                onValueChange={(v) => onFiltersChange({ ...filters, lifeArea: v === 'all' ? null : v as LifeArea })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {lifeAreas.map((area) => (
                    <SelectItem key={area} value={area}>
                      <div className="flex items-center gap-2">
                        <span>{LIFE_AREA_COLORS[area].icon}</span>
                        {LIFE_AREA_LABELS[area]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
              <Select 
                value={filters.priority || 'all'} 
                onValueChange={(v) => onFiltersChange({ ...filters, priority: v === 'all' ? null : v as TaskPriority })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', p.color)}>
                          {p.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.projectId && (
            <Badge variant="secondary" className="gap-1">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: projects.find(p => p.id === filters.projectId)?.color }}
              />
              {projects.find(p => p.id === filters.projectId)?.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, projectId: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.lifeArea && (
            <Badge variant="secondary" className="gap-1">
              {LIFE_AREA_COLORS[filters.lifeArea].icon} {LIFE_AREA_LABELS[filters.lifeArea]}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, lifeArea: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              {priorities.find(p => p.value === filters.priority)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, priority: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to filter tasks
export function filterTasks(
  tasks: any[],
  filters: TaskFiltersState
): any[] {
  return tasks.filter((task) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!task.title.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Project filter
    if (filters.projectId && task.project_id !== filters.projectId) {
      return false;
    }

    // Life area filter
    if (filters.lifeArea && task.life_area !== filters.lifeArea) {
      return false;
    }

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    return true;
  });
}
