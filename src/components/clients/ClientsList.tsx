import { useState } from 'react';
import { Client, ContentItem } from '@/types/content';
import { Profile, Project } from '@/types/database';
import { ClientCard } from './ClientCard';
import { ClientModal } from './ClientModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users } from 'lucide-react';

interface ClientsListProps {
  clients: Client[];
  contentItems: ContentItem[];
  project: Project;
  profile: Profile;
  onAddClient: (data: Parameters<typeof ClientModal>[0]['onSave'] extends (data: infer T) => void ? T : never) => Promise<Client | null>;
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<boolean>;
  onDeleteClient: (id: string) => Promise<boolean>;
  onSelectClient: (client: Client) => void;
}

export function ClientsList({
  clients,
  contentItems,
  project,
  profile,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onSelectClient,
}: ClientsListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.brand_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getContentStats = (clientId: string) => {
    const clientContent = contentItems.filter(c => c.client_id === clientId);
    const pendingApproval = clientContent.filter(c => 
      c.status === 'pending_review' || c.status === 'in_review'
    ).length;
    return {
      total: clientContent.length,
      pending: pendingApproval,
    };
  };

  const handleSave = async (data: Parameters<typeof ClientModal>[0]['onSave'] extends (data: infer T) => void ? T : never) => {
    if (editingClient) {
      await onUpdateClient(editingClient.id, data);
    } else {
      await onAddClient(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente? Se eliminarán todos sus contenidos.')) {
      await onDeleteClient(id);
    }
  };

  const handleOpenNew = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Clientes de {project.name}</h2>
          <span className="text-sm text-muted-foreground">({clients.length})</span>
        </div>
        <Button onClick={handleOpenNew} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nuevo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {clients.length === 0 
              ? 'No hay clientes en este proyecto' 
              : 'No se encontraron clientes'}
          </p>
          {clients.length === 0 && (
            <Button onClick={handleOpenNew} variant="outline" className="mt-3">
              <Plus className="w-4 h-4 mr-1" />
              Agregar primer cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const stats = getContentStats(client.id);
            return (
              <ClientCard
                key={client.id}
                client={client}
                contentCount={stats.total}
                pendingApprovalCount={stats.pending}
                onClick={() => onSelectClient(client)}
                onEdit={() => handleEdit(client)}
                onDelete={() => handleDelete(client.id)}
              />
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ClientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        client={editingClient}
        projectId={project.id}
        onSave={handleSave}
        onDelete={editingClient ? handleDelete : undefined}
      />
    </div>
  );
}
