import { useState, useMemo } from 'react';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionCategory,
  CATEGORY_CONFIG,
} from '@/types/subscription';
import { Project, Profile, Workspace } from '@/types/database';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { SubscriptionCard } from './SubscriptionCard';
import { SubscriptionTableView } from './SubscriptionTableView';
import { SubscriptionModal } from './SubscriptionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  FolderKanban,
  User,
  CheckCircle2,
  X,
  PieChart,
} from 'lucide-react';

interface SubscriptionsViewProps {
  profile: Profile;
  projects: Project[];
  profiles: Profile[];
  currentWorkspace?: Workspace | null;
}

export function SubscriptionsView({
  profile,
  projects,
  profiles,
  currentWorkspace,
}: SubscriptionsViewProps) {
  const {
    subscriptions,
    metrics,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscriptionStatus,
  } = useSubscriptions(profile, currentWorkspace);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = sub.name.toLowerCase().includes(query);
        const matchesEmail = (sub.login_email || '').toLowerCase().includes(query);
        const matchesNotes = (sub.notes || '').toLowerCase().includes(query);
        const matchesMethod = (sub.payment_method || '').toLowerCase().includes(query);
        const matchesOwner = (sub.owner_name || '').toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesNotes && !matchesMethod && !matchesOwner) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }

      // Project
      if (projectFilter !== 'all') {
        if (projectFilter === 'general') {
          if (sub.project_id) return false;
        } else if (sub.project_id !== projectFilter) {
          return false;
        }
      }

      // Owner
      if (ownerFilter !== 'all') {
        if (ownerFilter === 'company') {
          if (sub.owner_id || sub.owner_name) return false;
        } else if (sub.owner_id !== ownerFilter && sub.owner_name !== ownerFilter) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [subscriptions, search, statusFilter, projectFilter, ownerFilter, categoryFilter]);

  const hasActiveFilters =
    search ||
    statusFilter !== 'all' ||
    projectFilter !== 'all' ||
    ownerFilter !== 'all' ||
    categoryFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setProjectFilter('all');
    setOwnerFilter('all');
    setCategoryFilter('all');
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSub(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingSub) {
      return await updateSubscription(editingSub.id, data);
    } else {
      return await addSubscription(data);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la suscripción "${name}"?`)) {
      await deleteSubscription(id, name);
    }
  };

  const getProject = (id?: string | null) => projects.find((p) => p.id === id);
  const getOwner = (id?: string | null) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span>Gestor de Suscripciones</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Control centralizado de herramientas, costos periódicos, fechas de cobro y proyectos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            <PieChart className="w-3.5 h-3.5 text-primary" />
            <span>{showBreakdown ? 'Ocultar análisis' : 'Ver análisis de gasto'}</span>
          </Button>

          <Button onClick={handleCreate} size="sm" className="gap-1.5 font-semibold text-xs shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Nueva Suscripción</span>
          </Button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gasto Mensual Total */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Gasto Mensual</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black tracking-tight text-foreground">
                ${metrics.totalMonthlyUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground font-medium">USD</span>
            </div>
            {metrics.totalMonthlyDOP > 0 && (
              <p className="text-[11px] text-muted-foreground font-medium">
                + RD${metrics.totalMonthlyDOP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DOP
              </p>
            )}
          </CardContent>
        </Card>

        {/* Proyección Anual */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Proyección Anual</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black tracking-tight text-foreground">
                ${metrics.totalYearlyUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground font-medium">USD / año</span>
            </div>
            {metrics.totalYearlyDOP > 0 && (
              <p className="text-[11px] text-muted-foreground font-medium">
                + RD${metrics.totalYearlyDOP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DOP / año
              </p>
            )}
          </CardContent>
        </Card>

        {/* Suscripciones Activas */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Suscripciones</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {metrics.activeCount}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                activas
              </span>
              {metrics.pausedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {metrics.pausedCount} pausada{metrics.pausedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {metrics.totalCount} servicio{metrics.totalCount !== 1 ? 's' : ''} registrado{metrics.totalCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Próximos Cobros */}
        <Card className={`border shadow-sm bg-card ${metrics.upcomingWithin7Days > 0 ? 'border-amber-500/30' : ''}`}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Próximos Cobros</span>
              <div className={`w-7 h-7 rounded-lg ${metrics.upcomingWithin7Days > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'} flex items-center justify-center`}>
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {metrics.upcomingWithin7Days}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                en los prox. 7 días
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {metrics.upcomingWithin7Days > 0 ? 'Pagos programados esta semana' : 'Sin cobros inminentes'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optional Expense Breakdown Section */}
      {showBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/20">
          {/* Desglose por Proyecto */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              Gasto Mensual por Proyecto
            </h3>
            <div className="space-y-2">
              {Object.entries(metrics.projectTotals).map(([projId, data]) => {
                const proj = getProject(projId);
                const name = proj ? proj.name : 'General / Sin proyecto';
                return (
                  <div key={projId} className="flex items-center justify-between p-2 rounded-lg bg-card border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj?.color || '#888' }}
                      />
                      <span className="font-semibold truncate">{name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">{data.count}</Badge>
                    </div>
                    <div className="font-extrabold text-foreground text-right shrink-0">
                      {data.monthlyUSD > 0 && `$${data.monthlyUSD.toFixed(2)} USD`}
                      {data.monthlyUSD > 0 && data.monthlyDOP > 0 && ' + '}
                      {data.monthlyDOP > 0 && `RD$${data.monthlyDOP.toFixed(2)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose por Responsable */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Gasto Mensual por Responsable
            </h3>
            <div className="space-y-2">
              {Object.entries(metrics.ownerTotals).map(([ownerKey, data]) => (
                <div key={ownerKey} className="flex items-center justify-between p-2 rounded-lg bg-card border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                      {ownerKey.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold truncate">{ownerKey}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{data.count}</Badge>
                  </div>
                  <div className="font-extrabold text-foreground text-right shrink-0">
                    {data.monthlyUSD > 0 && `$${data.monthlyUSD.toFixed(2)} USD`}
                    {data.monthlyUSD > 0 && data.monthlyDOP > 0 && ' + '}
                    {data.monthlyDOP > 0 && `RD$${data.monthlyDOP.toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar suscripción, notas o cuenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* Filtro Estado */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">🟢 Activas</SelectItem>
              <SelectItem value="trial">🟡 En prueba</SelectItem>
              <SelectItem value="paused">🔵 Pausadas</SelectItem>
              <SelectItem value="cancelled">🔴 Canceladas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Proyecto */}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              <SelectItem value="general">Sin proyecto (General)</SelectItem>
              {projects.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Responsable */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los responsables</SelectItem>
              <SelectItem value="company">Empresa / General</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Categoría */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs font-semibold h-7 px-2">
            {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? 'suscripción' : 'suscripciones'}
          </Badge>

          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setViewMode('table')}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-2xl bg-card">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-foreground">
            {hasActiveFilters ? 'No hay suscripciones que coincidan con los filtros' : 'Aún no tienes suscripciones registradas'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {hasActiveFilters
              ? 'Intenta restablecer o modificar los criterios de búsqueda para ver los resultados.'
              : 'Agrega tus herramientas y servicios recurrentes (ChatGPT, Figma, Adobe, Google Workspace, etc.) para monitorear costos y fechas de cobro.'}
          </p>
          <div className="mt-4 flex gap-2">
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreate} className="gap-1.5 font-semibold">
                <Plus className="w-4 h-4" />
                Registrar primera suscripción
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              project={getProject(sub.project_id)}
              owner={getOwner(sub.owner_id)}
              onEdit={handleEdit}
              onToggleStatus={toggleSubscriptionStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <SubscriptionTableView
          subscriptions={filteredSubscriptions}
          projects={projects}
          profiles={profiles}
          onEdit={handleEdit}
          onToggleStatus={toggleSubscriptionStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Modal */}
      <SubscriptionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        subscription={editingSub}
        projects={projects}
        profiles={profiles}
        currentProfileId={profile.id}
        onSave={handleSave}
      />
    </div>
  );
}
