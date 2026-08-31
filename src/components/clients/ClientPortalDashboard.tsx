import { useState } from 'react';
import { Client, ContentItem } from '@/types/content';
import { Profile, Project } from '@/types/database';
import { useContentItems } from '@/hooks/useContentItems';
import { ClientPage } from './ClientPage';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  LogOut, 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface ClientPortalDashboardProps {
  profile: Profile;
  clients: Client[];
  onSignOut: () => void;
}

export function ClientPortalDashboard({
  profile,
  clients,
  onSignOut,
}: ClientPortalDashboardProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Get project IDs from clients
  const projectIds = [...new Set(clients.map(c => c.project_id))];
  const projectId = projectIds[0] || null;
  
  const { 
    contentItems, 
    updateContentItem, 
    approveContent, 
    requestChanges 
  } = useContentItems(profile, projectId);

  // Filter content for accessible clients
  const clientIds = clients.map(c => c.id);
  const myContentItems = contentItems.filter(c => clientIds.includes(c.client_id));
  
  // Calculate stats
  const pendingReview = myContentItems.filter(c => 
    c.status === 'pending_review' || c.status === 'in_review'
  ).length;
  const approved = myContentItems.filter(c => c.status === 'approved').length;
  const requiresChanges = myContentItems.filter(c => c.status === 'requires_changes').length;

  if (selectedClient) {
    const clientProject: Project = {
      id: selectedClient.project_id,
      name: selectedClient.name,
      description: null,
      sector: 'marketing',
      color: '#6366f1',
      owner_id: profile.id,
      uses_clients: true,
      uses_content_calendar: true,
      allows_client_access: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl px-3 sm:px-4 py-3 sm:py-4 md:py-6 lg:py-10">
          <ClientPage
            client={selectedClient}
            project={clientProject}
            profile={profile}
            contentItems={myContentItems}
            profiles={[profile]}
            onBack={() => setSelectedClient(null)}
            onAddContent={async () => null}
          onUpdateContent={updateContentItem}
            onDeleteContent={async () => false}
            onApproveContent={approveContent}
            onRequestChanges={requestChanges}
            isClientView={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl px-3 sm:px-4 py-3 sm:py-4 md:py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Portal de Clientes</h1>
              <p className="text-sm text-muted-foreground">Hola, {profile.display_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{myContentItems.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Por revisar</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{pendingReview}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Aprobados</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Con cambios</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{requiresChanges}</p>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Tus marcas</h2>
          <div className="space-y-2">
            {clients.map((client) => {
              const clientContent = myContentItems.filter(c => c.client_id === client.id);
              const clientPending = clientContent.filter(c => 
                c.status === 'pending_review' || c.status === 'in_review'
              ).length;
              
              const initials = client.brand_name 
                ? client.brand_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                : client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

              return (
                <Card 
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage src={client.logo_url || ''} alt={client.name} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{client.brand_name || client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {clientContent.length} contenidos
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {clientPending > 0 && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                            {clientPending} pendientes
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-medium mb-1">Sin acceso a marcas</h3>
              <p className="text-sm text-muted-foreground">
                Contacta a tu agencia para obtener acceso a tus contenidos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
