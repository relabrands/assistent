import { useState, useEffect } from 'react';
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
import { Client } from '@/types/content';
import { Search, X, SlidersHorizontal, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export interface TaskFiltersState {
  search: string;
  projectId: string | null;
  clientId: string | null;
  lifeArea: LifeArea | null;
  priority: TaskPriority | null;
  status: string | null;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  projects: Project[];
  clients?: Client[];
}

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-700' },
];

const lifeAreas: LifeArea[] = ['trabajo', 'personal', 'salud', 'aprendizaje', 'finanzas'];

export function TaskFilters({ filters, onFiltersChange, projects, clients }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectClients, setProjectClients] = useState<Client[]>([]);

  // Load clients fallback if clients prop is not provided or empty
  useEffect(() => {
    if (clients && clients.length > 0) return;
    const q = filters.projectId
      ? query(collection(db, 'clients'), where('project_id', '==', filters.projectId))
      : query(collection(db, 'clients'));
    getDocs(q)
      .then((snap) => setProjectClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))))
      .catch(console.error);
  }, [filters.projectId, clients]);

  const availableClients = (clients && clients.length > 0)
    ? (filters.projectId ? clients.filter(c => c.project_id === filters.projectId) : clients)
    : projectClients;

  const activeFiltersCount = [
    filters.projectId,
    filters.clientId,
    filters.lifeArea,
    filters.priority,
    filters.status,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      projectId: null,
      clientId: null,
      lifeArea: null,
      priority: null,
      status: null,
    });
  };

  const hasActiveFilters = filters.search || activeFiltersCount > 0;

  const selectedProject = projects.find(p => p.id === filters.projectId);
  const selectedClient = (clients || projectClients).find(c => c.id === filters.clientId);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/30">
            {/* Project filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
              <Select 
                value={filters.projectId || 'all'} 
                onValueChange={(v) => onFiltersChange({ 
                  ...filters, 
                  projectId: v === 'all' ? null : v,
                  clientId: null, // reset client when project changes
                })}
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

            {/* Client filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Cliente
              </label>
              <Select 
                value={filters.clientId || 'all'} 
                onValueChange={(v) => onFiltersChange({ ...filters, clientId: v === 'all' ? null : v })}
                disabled={availableClients.length === 0}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={availableClients.length === 0 ? 'Sin clientes' : (filters.projectId ? 'Clientes del proyecto' : 'Todos los clientes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {availableClients.map((c) => {
                    const clientProj = !filters.projectId ? projects.find(p => p.id === c.project_id) : null;
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(c.brand_name || c.name).charAt(0).toUpperCase()}
                          </div>
                          <span>{c.brand_name || c.name}</span>
                          {clientProj && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              ({clientProj.name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
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
          {filters.search && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Search className="w-3 h-3" />
              "{filters.search}"
              <Button
                variant="ghost" size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.projectId && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: selectedProject?.color }}
              />
              {selectedProject?.name}
              <Button
                variant="ghost" size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, projectId: null, clientId: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.clientId && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <User className="w-3 h-3 text-primary" />
              {selectedClient?.brand_name || selectedClient?.name}
              <Button
                variant="ghost" size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, clientId: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.lifeArea && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {LIFE_AREA_COLORS[filters.lifeArea].icon} {LIFE_AREA_LABELS[filters.lifeArea]}
              <Button
                variant="ghost" size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, lifeArea: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {priorities.find(p => p.value === filters.priority)?.label}
              <Button
                variant="ghost" size="icon"
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
export function filterTasks(tasks: any[], filters: TaskFiltersState, clients?: Client[]): any[] {
  return tasks.filter((task) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(searchLower);
      const matchClient = task.client ? task.client.toLowerCase().includes(searchLower) : false;
      if (!matchTitle && !matchClient) return false;
    }
    if (filters.projectId && task.project_id !== filters.projectId) return false;
    if (filters.clientId) {
      const matchId = task.client_id === filters.clientId;
      const matchedClient = clients?.find(c => c.id === filters.clientId);
      const matchName = matchedClient && task.client && (task.client === matchedClient.name || task.client === matchedClient.brand_name);
      if (!matchId && !matchName) return false;
    }
    if (filters.lifeArea && task.life_area !== filters.lifeArea) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    return true;
  });
}
