import { useState } from 'react';
import { Client, ContentItem } from '@/types/content';
import { Profile, Project } from '@/types/database';
import { ClientsList } from './ClientsList';
import { ClientAccessManager } from './ClientAccessManager';
import { ClientPage } from './ClientPage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, FileText, Settings } from 'lucide-react';

interface AdminClientManagerProps {
  project: Project;
  profile: Profile;
  clients: Client[];
  contentItems: ContentItem[];
  profiles: Profile[];
  onAddClient: (data: any) => Promise<Client | null>;
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<boolean>;
  onDeleteClient: (id: string) => Promise<boolean>;
  onAddContent: (data: any) => Promise<ContentItem | null>;
  onUpdateContent: (id: string, data: any) => Promise<boolean>;
  onDeleteContent: (id: string) => Promise<boolean>;
  onBack: () => void;
}

type ViewMode = 'list' | 'client-content' | 'client-access';

export function AdminClientManager({
  project,
  profile,
  clients,
  contentItems,
  profiles,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddContent,
  onUpdateContent,
  onDeleteContent,
  onBack,
}: AdminClientManagerProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'access'>('content');

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setActiveTab('content');
  };

  const handleBackToList = () => {
    setSelectedClient(null);
  };

  // If viewing a selected client
  if (selectedClient) {
    const clientContentItems = contentItems.filter(c => c.client_id === selectedClient.id);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{selectedClient.brand_name || selectedClient.name}</h2>
            <p className="text-sm text-muted-foreground">Proyecto: {project.name}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'content' | 'access')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contenidos
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Accesos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-4">
            <ClientPage
              client={selectedClient}
              project={project}
              contentItems={clientContentItems}
              profile={profile}
              profiles={profiles}
              onAddContent={onAddContent}
              onUpdateContent={onUpdateContent}
              onDeleteContent={onDeleteContent}
              onApproveContent={async (id) => {
                return await onUpdateContent(id, {
                  status: 'approved',
                  approved_by: profile.id,
                  approved_at: new Date().toISOString(),
                });
              }}
              onRequestChanges={async (id) => {
                return await onUpdateContent(id, { status: 'requires_changes' });
              }}
              onBack={handleBackToList}
              isEmbedded
            />
          </TabsContent>
          
          <TabsContent value="access" className="mt-4">
            <ClientAccessManager client={selectedClient} profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Show clients list
  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Gestión de Clientes</h2>
          <p className="text-sm text-muted-foreground">Proyecto: {project.name}</p>
        </div>
      </div>

      {/* Clients List */}
      <ClientsList
        clients={clients}
        contentItems={contentItems}
        project={project}
        profile={profile}
        onAddClient={onAddClient}
        onUpdateClient={onUpdateClient}
        onDeleteClient={onDeleteClient}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
}
