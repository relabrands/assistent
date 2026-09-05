import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Database,
  Layers,
  Sparkles,
  Calendar,
  Bell,
  Clock,
  Check,
} from 'lucide-react';
import { Client } from '@/types/content';
import { Workspace, Profile } from '@/types/database';
import {
  runNotionSync,
  getConnectedNotionDatabases,
  NotionDbSyncStatus,
  NotionSyncProgress,
  KNOWN_NOTION_DATABASES,
} from '@/services/notionSync';
import { toast } from 'sonner';

interface NotionIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  currentWorkspace: Workspace | null;
  clients: Client[];
  onUpdateClient?: (id: string, data: Partial<Client>) => Promise<boolean>;
  onSyncComplete?: () => void;
}

export function NotionIntegrationModal({
  isOpen,
  onClose,
  profile,
  currentWorkspace,
  clients,
  onUpdateClient,
  onSyncComplete,
}: NotionIntegrationModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<NotionSyncProgress | null>(null);
  const [dbStatuses, setDbStatuses] = useState<NotionDbSyncStatus[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<{
    time: string;
    overdueCreated: number;
    quotaAlertsCreated: number;
  } | null>(null);

  const [connectedDbs, setConnectedDbs] = useState<Array<{ id: string; title: string }>>(KNOWN_NOTION_DATABASES);
  const [isLoadingDbs, setIsLoadingDbs] = useState(false);
  const [editingQuotas, setEditingQuotas] = useState<Record<string, number>>({});

  // Load connected databases on modal open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingDbs(true);
      getConnectedNotionDatabases()
        .then((dbs) => {
          setConnectedDbs(dbs);
          // Initialize quota map
          const quotaMap: Record<string, number> = {};
          dbs.forEach((db) => {
            const matched = clients.find(
              (c) =>
                c.name?.toLowerCase().includes(db.title.toLowerCase()) ||
                db.title.toLowerCase().includes(c.name?.toLowerCase() || '')
            );
            quotaMap[db.id] = matched?.monthly_content_quota || 8;
          });
          setEditingQuotas(quotaMap);
        })
        .finally(() => setIsLoadingDbs(false));
    }
  }, [isOpen, clients]);

  const handleRunSync = async () => {
    setIsSyncing(true);
    setProgress({ step: 'Iniciando conexión con Notion...', processed: 5, total: 100 });

    try {
      const result = await runNotionSync({
        clients,
        currentWorkspace,
        profile,
        defaultQuota: 8,
        onProgress: (p) => setProgress(p),
      });

      if (result.success) {
        setDbStatuses(result.databases);
        setLastSyncResult({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          overdueCreated: result.overdueCreated,
          quotaAlertsCreated: result.quotaAlertsCreated,
        });

        if (result.overdueCreated > 0 || result.quotaAlertsCreated > 0) {
          toast.success(
            `Sincronización finalizada: ${result.overdueCreated} contenido(s) vencido(s) y ${result.quotaAlertsCreated} alerta(s) de cuota detectadas.`
          );
        } else {
          toast.success('Sincronización completada. Todos los contenidos al día.');
        }

        onSyncComplete?.();
      } else {
        toast.error(result.error || 'Error durante la sincronización');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error('Error al sincronizar con Notion');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateQuota = async (dbId: string, clientName: string, newQuota: number) => {
    setEditingQuotas((prev) => ({ ...prev, [dbId]: newQuota }));
    const matched = clients.find(
      (c) =>
        c.name?.toLowerCase().includes(clientName.toLowerCase()) ||
        clientName.toLowerCase().includes(c.name?.toLowerCase() || '')
    );

    if (matched && onUpdateClient) {
      const ok = await onUpdateClient(matched.id, {
        monthly_content_quota: newQuota,
        notion_database_id: dbId,
      });
      if (ok) {
        toast.success(`Cuota de ${matched.name} actualizada a ${newQuota} contenidos/mes`);
      }
    } else {
      toast.info(`Cuota configurada a ${newQuota} contenidos/mes`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl">
        {/* Header with Notion branding */}
        <div className="p-6 border-b border-border bg-card/60 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black dark:bg-white/10 flex items-center justify-center shadow-md border border-white/20">
                <span className="text-xl font-bold text-white tracking-tighter">N</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-semibold">Integración con Notion</DialogTitle>
                  <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Conectado
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Workspace: <span className="font-medium text-foreground">RELA Brands S.R.L.</span> • Monitoreo automático de contenidos y cuotas mensuales
                </DialogDescription>
              </div>
            </div>

            <Button
              onClick={handleRunSync}
              disabled={isSyncing}
              className="gap-2 shadow-sm font-medium"
              size="sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </Button>
          </div>

          {/* Sync Progress Bar */}
          {isSyncing && progress && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                  {progress.step}
                </span>
                <span>{progress.processed}%</span>
              </div>
              <Progress value={progress.processed} className="h-1.5" />
            </div>
          )}

          {/* Last sync stats banner */}
          {lastSyncResult && !isSyncing && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 text-xs text-muted-foreground border border-border/50">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Última sincronización: <strong className="text-foreground">{lastSyncResult.time}</strong>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {lastSyncResult.overdueCreated} no publicados
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  {lastSyncResult.quotaAlertsCreated} alertas de cuota
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rules Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-medium text-foreground">Detección de Contenido Vencido</p>
                <p className="text-muted-foreground leading-relaxed">
                  Si un contenido en Notion tiene fecha programada para hoy o días pasados y no está marcado como <strong>"Posteado"</strong>, se genera automáticamente una tarea en riesgo en el CRM.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-medium text-foreground">Alarma de Cuota Mensual Insuficiente</p>
                <p className="text-muted-foreground leading-relaxed">
                  Si durante el mes en curso un cliente tiene menos contenidos programados que su cuota objetivo (por defecto 8 contenidos), se crea una tarea prioritaria para planificar copys y artes.
                </p>
              </div>
            </div>
          </div>

          {/* Connected Client Databases List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Bases de Datos de Clientes Conectadas ({connectedDbs.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Sincronización cada 2 horas vía Cloud Functions
              </span>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {connectedDbs.map((db) => {
                const status = dbStatuses.find((s) => s.id === db.id);
                const currentQuota = editingQuotas[db.id] || 8;

                return (
                  <div
                    key={db.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate max-w-xs sm:max-w-md">
                          {db.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          ID: {db.id.slice(0, 8)}...
                        </Badge>
                      </div>

                      {/* Status details after sync */}
                      {status ? (
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="text-muted-foreground">
                            Total contenidos: <strong className="text-foreground">{status.totalPages}</strong>
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Este mes: {status.monthPostsCount} programados
                          </span>
                          {status.overdueCount > 0 ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {status.overdueCount} sin publicar
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Al día
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Listo para sincronizar • Cuota objetivo activa
                        </p>
                      )}
                    </div>

                    {/* Quota Setting & Notion Link */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">
                          Cuota/mes:
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={currentQuota}
                          onChange={(e) =>
                            handleUpdateQuota(db.id, db.title, parseInt(e.target.value) || 8)
                          }
                          className="w-16 h-8 text-center text-xs font-semibold"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <a
                          href={`https://notion.so/${db.id.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir en Notion"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical Info & Connection Security */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Token de Integración Activo y Verificado
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La integración utiliza el token <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">ntn_167...984</code> autorizado con permisos de lectura para el espacio de trabajo de Notion. Las tareas se crean con deduplicación por <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">notion_page_id</code>, por lo que nunca se duplicarán en el CRM.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs gap-1.5"
          >
            <a
              href="https://app.notion.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Notion Workspace
            </a>
          </Button>

          <Button onClick={onClose} size="sm" variant="default">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
