import { useState } from 'react';
import { Client, ContentItem, CONTENT_STATUS_LABELS, CONTENT_STATUS_COLORS, PLATFORM_LABELS, PLATFORM_COLORS } from '@/types/content';
import { Profile, Project } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  UserPlus
} from 'lucide-react';
import { ContentCalendar } from '../content/ContentCalendar';
import { ContentList } from '../content/ContentList';
import { ContentModal } from '../content/ContentModal';
import { InviteClientModal } from './InviteClientModal';
import { CustomFieldsManager } from '../content/CustomFieldsManager';

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
  isClientView = false,
  isEmbedded = false,
}: ClientPageProps) {
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

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
          </div>
          
          {!isClientView && (
            <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
