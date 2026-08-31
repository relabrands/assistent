import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useContentItems } from '@/hooks/useContentItems';
import { Project, Profile } from '@/types/database';
import { AdminClientManager } from '@/components/clients/AdminClientManager';
import { Loader2 } from 'lucide-react';

interface ClientsViewProps {
  project: Project;
  profiles: Profile[];
  onBack: () => void;
}

export function ClientsView({ project, profiles, onBack }: ClientsViewProps) {
  const { profile } = useAuth();
  const { clients, addClient, updateClient, deleteClient } = useClients(profile, project.id);
  const { contentItems, addContentItem, updateContentItem, deleteContentItem } = useContentItems(profile);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <AdminClientManager
      project={project}
      profile={profile}
      clients={clients}
      contentItems={contentItems}
      profiles={profiles}
      onAddClient={addClient}
      onUpdateClient={updateClient}
      onDeleteClient={deleteClient}
      onAddContent={addContentItem}
      onUpdateContent={updateContentItem}
      onDeleteContent={deleteContentItem}
      onBack={onBack}
    />
  );
}
