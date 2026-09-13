import { useMemo } from 'react';
import {
  Subscription,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
  BILLING_CYCLE_LABELS,
  getDaysUntilRenewal,
} from '@/types/subscription';
import { Project, Profile } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Calendar,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Edit2,
  FolderKanban,
  User,
  Clock,
  AlertCircle,
  Copy,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionCardProps {
  subscription: Subscription;
  project?: Project | null;
  owner?: Profile | null;
  onEdit: (sub: Subscription) => void;
  onToggleStatus: (sub: Subscription) => void;
  onDelete: (id: string, name: string) => void;
}

export function SubscriptionCard({
  subscription: sub,
  project,
  owner,
  onEdit,
  onToggleStatus,
  onDelete,
}: SubscriptionCardProps) {
  const catConfig = CATEGORY_CONFIG[sub.category] || CATEGORY_CONFIG.other;
  const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
  const daysUntil = useMemo(() => getDaysUntilRenewal(sub), [sub]);

  const formattedCost = useMemo(() => {
    const symbol = sub.currency === 'USD' ? '$' : sub.currency === 'DOP' ? 'RD$' : '€';
    return `${symbol}${sub.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [sub.cost, sub.currency]);

  const copyEmail = () => {
    if (sub.login_email) {
      navigator.clipboard.writeText(sub.login_email);
      toast.success('Correo copiado al portapapeles');
    }
  };

  return (
    <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-primary/30 bg-card">
      {/* Top accent line by category */}
      <div className={`h-1 w-full ${catConfig.bg.replace('/10', '')}`} />

      <CardContent className="p-4 space-y-3.5">
        {/* Header: Service Name + Status + More Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${catConfig.bg} ${catConfig.color} flex items-center justify-center shrink-0 border ${catConfig.border}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {sub.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-medium ${catConfig.color} ${catConfig.bg} border-transparent`}
                >
                  {catConfig.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-semibold ${statusConfig.color} ${statusConfig.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1 animate-pulse`} />
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(sub)}>
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(sub)}>
                {sub.status === 'active' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-2 text-blue-500" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Reactivar
                  </>
                )}
              </DropdownMenuItem>
              {sub.login_email && (
                <DropdownMenuItem onClick={copyEmail}>
                  <Copy className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Copiar correo ({sub.login_email})
                </DropdownMenuItem>
              )}
              {sub.website_url && (
                <DropdownMenuItem asChild>
                  <a href={sub.website_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-2 text-primary" /> Ir al sitio
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(sub.id, sub.name)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cost & Cycle Banner */}
        <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              {formattedCost}
            </span>
            <span className="text-xs text-muted-foreground font-medium ml-1">
              / {BILLING_CYCLE_LABELS[sub.billing_cycle].toLowerCase()}
            </span>
          </div>

          {/* Days until renewal badge */}
          {daysUntil !== null && sub.status === 'active' && (
            <div className="flex items-center gap-1">
              {daysUntil <= 3 ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                  <AlertCircle className="w-3 h-3 text-rose-500 animate-bounce" />
                  {daysUntil === 0 ? 'Cobro hoy' : `En ${daysUntil} día${daysUntil > 1 ? 's' : ''}`}
                </Badge>
              ) : daysUntil <= 7 ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1 px-2 py-0.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  En {daysUntil} días
                </Badge>
              ) : (
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  En {daysUntil} días
                </span>
              )}
            </div>
          )}
        </div>

        {/* Project & Owner Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
          {/* Proyecto */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Proyecto: ${project?.name || 'General'}`}>
            <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider leading-none">
                Proyecto
              </p>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {project ? project.name : 'General'}
              </p>
            </div>
          </div>

          {/* Responsable */}
          <div className="flex items-center gap-1.5 min-w-0" title={`De quién es: ${sub.owner_name || owner?.display_name || 'General'}`}>
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider leading-none">
                De quién es
              </p>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {sub.owner_name || owner?.display_name || 'Empresa'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer: Payment method & Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            {sub.payment_day ? (
              <span>Día {sub.payment_day} de cobro</span>
            ) : sub.next_payment_date ? (
              <span>Cobro: {sub.next_payment_date}</span>
            ) : (
              <span>{sub.payment_method || 'Sin método registrado'}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {sub.website_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                title="Abrir sitio web"
                asChild
              >
                <a href={sub.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px] font-medium"
              onClick={() => onEdit(sub)}
            >
              Editar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
