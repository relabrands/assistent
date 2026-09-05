import { useState, useEffect } from 'react';
import { Client, ContentItem, CONTENT_STATUS_LABELS, CONTENT_STATUS_COLORS, PLATFORM_LABELS, PLATFORM_COLORS } from '@/types/content';
import { Profile, Project } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Plus, 
  Globe, 
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  ExternalLink,
  UserPlus,
  RefreshCw,
  Database,
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { ContentCalendar } from '../content/ContentCalendar';
import { ContentList } from '../content/ContentList';
import { ContentModal } from '../content/ContentModal';
import { InviteClientModal } from './InviteClientModal';
import { CustomFieldsManager } from '../content/CustomFieldsManager';
import { runNotionSync, getConnectedNotionDatabases, KNOWN_NOTION_DATABASES } from '@/services/notionSync';
import { toast } from 'sonner';

interface ClientPageProps {
  client: Client;
  project: Project;
  profile: Profile;
  contentItems: ContentItem[];
  profiles: Profile[];
  onBack: () => void;
  onAddContent: (data: any) => Promise<ContentItem | null>;
  onUpdateContent: (id: string, data: any) => Promise<boolean>;
  onDeleteContent: (id: string) => Promise<boolean>;
  onApproveContent: (id: string) => Promise<boolean>;
  onRequestChanges: (id: string) => Promise<boolean>;
  onUpdateClient?: (id: string, data: Partial<Client>) => Promise<boolean>;
  clients?: Client[];
  isClientView?: boolean;
  isEmbedded?: boolean;
}

export function ClientPage({
  client,
  project,
  profile,
  contentItems,
  profiles,
  onBack,
  onAddContent,
  onUpdateContent,
  onDeleteContent,
  onApproveContent,
  onRequestChanges,
  onUpdateClient,
  clients = [],
  isClientView = false,
  isEmbedded = false,
}: ClientPageProps) {
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const [isLinkDbModalOpen, setIsLinkDbModalOpen] = useState(false);
  const [availableDbs, setAvailableDbs] = useState<Array<{ id: string; title: string }>>(KNOWN_NOTION_DATABASES);
  const [selectedDbIdToLink, setSelectedDbIdToLink] = useState<string>(client.notion_database_id || '');

  // Load connected databases
  useEffect(() => {
    getConnectedNotionDatabases().then((dbs) => {
      if (dbs && dbs.length > 0) {
        setAvailableDbs(dbs);
      }
    });
  }, []);

  const linkedDb = availableDbs.find(d => 
    (client.notion_database_id && client.notion_database_id.replace(/-/g, '') === d.id.replace(/-/g, '')) ||
    (client.brand_name && d.title.toLowerCase().includes(client.brand_name.toLowerCase())) ||
    (client.name && d.title.toLowerCase().includes(client.name.toLowerCase())) ||
    (client.name && client.name.toLowerCase().includes(d.title.toLowerCase()))
  );

  const clientContent = contentItems.filter(c => c.client_id === client.id);

  const initials = client.brand_name 
    ? client.brand_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveContent = async (data: any) => {
    if (editingContent) {
      await onUpdateContent(editingContent.id, data);
    } else {
      await onAddContent({
        ...data,
        client_id: client.id,
        project_id: project.id,
      });
    }
  };

  const handleEditContent = (content: ContentItem) => {
    setEditingContent(content);
    setIsContentModalOpen(true);
  };

  const handleDeleteContent = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contenido?')) {
      await onDeleteContent(id);
    }
  };

  const handleOpenNewContent = () => {
    setEditingContent(null);
    setIsContentModalOpen(true);
  };

  const handleSyncNotion = async () => {
    setIsSyncingNotion(true);
    toast.info(`Sincronizando contenidos de ${client.brand_name || client.name} desde Notion...`);
    try {
      const res = await runNotionSync({
        clients: clients.length > 0 ? clients : [client],
        currentWorkspace: null,
        profile,
        startDate: '2026-08-01',
        cleanBefore: false,
      });
      if (res.success) {
        toast.success('¡Sincronización completada! El calendario de contenidos se ha actualizado.');
      } else {
        toast.error(res.error || 'Error al sincronizar con Notion');
      }
    } catch (e: any) {
      console.error('Error syncing notion in client page:', e);
      toast.error('Error al sincronizar con Notion');
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const handleSaveLinkedDb = async () => {
    if (!onUpdateClient || !selectedDbIdToLink) return;
    const ok = await onUpdateClient(client.id, {
      notion_database_id: selectedDbIdToLink,
    });
    if (ok) {
      toast.success('Base de datos de Notion vinculada correctamente.');
      setIsLinkDbModalOpen(false);
      handleSyncNotion();
    } else {
      toast.error('Error al vincular base de datos.');
    }
  };

  // Stats
  const stats = {
    total: clientContent.length,
    draft: clientContent.filter(c => c.status === 'draft').length,
    pendingReview: clientContent.filter(c => c.status === 'pending_review' || c.status === 'in_review').length,
    approved: clientContent.filter(c => c.status === 'approved').length,
    published: clientContent.filter(c => c.status === 'published').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {!isEmbedded && (
          <Button variant="ghost" onClick={onBack} className="w-fit -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a clientes
          </Button>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Avatar className="h-20 w-20 rounded-xl">
            <AvatarImage src={client.logo_url || ''} alt={client.name} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              {client.brand_name && (
                <p className="text-muted-foreground">{client.brand_name}</p>
              )}
            </div>
            
            {/* Contact & Social */}
            <div className="flex flex-wrap gap-2">
              {client.contact_email && (
                <Badge variant="secondary" className="text-xs">
                  <Mail className="w-3 h-3 mr-1" />
                  {client.contact_email}
                </Badge>
              )}
              {client.contact_phone && (
                <Badge variant="secondary" className="text-xs">
                  <Phone className="w-3 h-3 mr-1" />
                  {client.contact_phone}
                </Badge>
              )}
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                    <Globe className="w-3 h-3 mr-1" />
                    Sitio web
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Badge>
                </a>
              )}
              {client.social_instagram && (
                <Badge variant="outline" className="text-xs">
                  <Instagram className="w-3 h-3 mr-1" />
                  {client.social_instagram}
                </Badge>
              )}
              {client.social_linkedin && (
                <Badge variant="outline" className="text-xs">
                  <Linkedin className="w-3 h-3 mr-1" />
                  LinkedIn
                </Badge>
              )}
              {client.social_youtube && (
                <Badge variant="outline" className="text-xs">
                  <Youtube className="w-3 h-3 mr-1" />
                  YouTube
                </Badge>
              )}
            </div>

            {/* Notion Database Connection Status */}
            <div className="flex items-center gap-2 pt-1">
              {linkedDb ? (
                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-[10px] px-1 bg-black text-white dark:bg-white dark:text-black rounded mr-0.5">N</span>
                  <span>Notion: <strong className="font-semibold">{linkedDb.title}</strong></span>
                  {!isClientView && onUpdateClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDbIdToLink(linkedDb.id);
                        setIsLinkDbModalOpen(true);
                      }}
                      className="ml-1 text-[11px] underline text-muted-foreground hover:text-foreground"
                      title="Cambiar base de datos"
                    >
                      (cambiar)
                    </button>
                  )}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  onClick={() => !isClientView && onUpdateClient && setIsLinkDbModalOpen(true)}
                  className={`gap-1.5 py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-normal ${!isClientView && onUpdateClient ? 'cursor-pointer hover:bg-amber-500/20 transition-colors' : ''}`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Sin base de datos de Notion vinculada</span>
                  {!isClientView && onUpdateClient && (
                    <span className="underline font-semibold ml-1">Vincular base de datos</span>
                  )}
                </Badge>
              )}
            </div>
          </div>
          
          {!isClientView && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSyncNotion}
                disabled={isSyncingNotion}
                className="gap-1.5 border-primary/20 hover:bg-primary/5 shadow-sm font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotion ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                <span className="font-bold text-xs px-1 bg-black text-white dark:bg-white dark:text-black rounded">N</span>
                <span>{isSyncingNotion ? 'Sincronizando...' : 'Sincronizar Notion'}</span>
              </Button>
              <CustomFieldsManager projectId={project.id} />
              <Button variant="outline" onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Invitar cliente</span>
              </Button>
              <Button onClick={handleOpenNewContent}>
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Nuevo contenido</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          <p className="text-xs text-muted-foreground">Borradores</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Aprobados</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
          <p className="text-xs text-muted-foreground">Publicados</p>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <ContentCalendar
            contentItems={clientContent}
            profiles={profiles}
            onContentClick={(content) => {
              setSelectedContent(content);
              setEditingContent(content);
              setIsContentModalOpen(true);
            }}
            onAddContent={handleOpenNewContent}
            isClientView={isClientView}
          />
        </TabsContent>

        <TabsContent value="list">
          <ContentList
            contentItems={clientContent}
            profiles={profiles}
            onEdit={handleEditContent}
            onDelete={handleDeleteContent}
            onApprove={onApproveContent}
            onRequestChanges={onRequestChanges}
            isClientView={isClientView}
          />
        </TabsContent>
      </Tabs>

      {/* Content Modal */}
      <ContentModal
        open={isContentModalOpen}
        onOpenChange={setIsContentModalOpen}
        content={editingContent}
        clientId={client.id}
        projectId={project.id}
        profiles={profiles}
        profile={profile}
        onSave={handleSaveContent}
        onDelete={editingContent ? () => handleDeleteContent(editingContent.id) : undefined}
        onApprove={editingContent ? () => onApproveContent(editingContent.id) : undefined}
        onRequestChanges={editingContent ? () => onRequestChanges(editingContent.id) : undefined}
        isClientView={isClientView}
      />

      {/* Invite Client Modal */}
      <InviteClientModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        client={client}
        profile={profile}
      />

      {/* Link Notion Database Dialog */}
      <Dialog open={isLinkDbModalOpen} onOpenChange={setIsLinkDbModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-bold text-xs px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded">N</span>
              Vincular Base de Datos de Notion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecciona la base de datos de Notion correspondiente a <strong>{client.brand_name || client.name}</strong> para sincronizar automáticamente sus contenidos en el calendario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Base de Datos Conectada en Notion:
              </label>
              <Select
                value={selectedDbIdToLink}
                onValueChange={setSelectedDbIdToLink}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar base de datos..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDbs.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      {db.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/60 rounded-lg text-xs text-muted-foreground space-y-1 border border-border/50">
              <p className="font-medium text-foreground flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-primary" />
                Sincronización Automática
              </p>
              <p>
                Al guardar, se importarán todas las publicaciones desde el 1 de agosto con sus fechas, estados, copys, artes y enlaces directos a Notion.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDbModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveLinkedDb}
              disabled={!selectedDbIdToLink}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              Vincular y Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
