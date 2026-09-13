import { useMemo } from 'react';
import {
  Subscription,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
  BILLING_CYCLE_LABELS,
  getDaysUntilRenewal,
} from '@/types/subscription';
import { Project, Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface SubscriptionTableViewProps {
  subscriptions: Subscription[];
  projects: Project[];
  profiles: Profile[];
  onEdit: (sub: Subscription) => void;
  onToggleStatus: (sub: Subscription) => void;
  onDelete: (id: string, name: string) => void;
}

export function SubscriptionTableView({
  subscriptions,
  projects,
  profiles,
  onEdit,
  onToggleStatus,
  onDelete,
}: SubscriptionTableViewProps) {
  const getProject = (id?: string | null) => projects.find((p) => p.id === id);
  const getOwner = (id?: string | null) => profiles.find((p) => p.id === id);

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs">Servicio</TableHead>
              <TableHead className="font-bold text-xs">Proyecto</TableHead>
              <TableHead className="font-bold text-xs">De quién es</TableHead>
              <TableHead className="font-bold text-xs">Ciclo</TableHead>
              <TableHead className="font-bold text-xs">Próximo Cobro</TableHead>
              <TableHead className="font-bold text-xs">Estado</TableHead>
              <TableHead className="font-bold text-xs text-right">Costo</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  No se encontraron suscripciones con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => {
                const project = getProject(sub.project_id);
                const owner = getOwner(sub.owner_id);
                const catConfig = CATEGORY_CONFIG[sub.category] || CATEGORY_CONFIG.other;
                const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
                const daysUntil = getDaysUntilRenewal(sub);
                const symbol = sub.currency === 'USD' ? '$' : sub.currency === 'DOP' ? 'RD$' : '€';

                return (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                    {/* Servicio y Categoría */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg ${catConfig.bg} ${catConfig.color} flex items-center justify-center shrink-0`}
                        >
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground truncate">{sub.name}</span>
                            {sub.website_url && (
                              <a
                                href={sub.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span className={`text-[10px] ${catConfig.color} font-medium block truncate`}>
                            {catConfig.label}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Proyecto */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 max-w-[150px] truncate">
                        {project?.color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                        )}
                        <span className="text-xs text-foreground font-medium truncate">
                          {project ? project.name : 'General'}
                        </span>
                      </div>
                    </TableCell>

                    {/* De quién es */}
                    <TableCell>
                      <span className="text-xs text-foreground font-medium truncate max-w-[140px] block">
                        {sub.owner_name || owner?.display_name || 'Empresa'}
                      </span>
                    </TableCell>

                    {/* Ciclo de cobro */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {BILLING_CYCLE_LABELS[sub.billing_cycle]}
                      </span>
                    </TableCell>

                    {/* Próximo cobro */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {daysUntil !== null && sub.status === 'active' ? (
                          daysUntil <= 3 ? (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold gap-1 px-1.5 py-0">
                              <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
                              {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                            </Badge>
                          ) : daysUntil <= 7 ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1 px-1.5 py-0">
                              <Clock className="w-2.5 h-2.5 text-amber-500" />
                              {daysUntil}d
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">En {daysUntil} días</span>
                          )
                        ) : sub.payment_day ? (
                          <span className="text-xs text-muted-foreground">Día {sub.payment_day}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-semibold ${statusConfig.color} ${statusConfig.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1`} />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>

                    {/* Costo */}
                    <TableCell className="text-right">
                      <span className="text-xs font-extrabold text-foreground">
                        {symbol}
                        {sub.cost.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                            <MoreVertical className="w-3.5 h-3.5" />
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(sub.id, sub.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
