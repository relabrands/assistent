import { useState } from 'react';
import { Client } from '@/types/content';
import { Profile } from '@/types/database';
import { useClientAccess, ClientAccessRole } from '@/hooks/useClientAccess';
import { InviteClientModal } from './InviteClientModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Users, Mail, Calendar, Shield, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientAccessManagerProps {
  client: Client;
  profile: Profile;
}

const ROLE_LABELS: Record<ClientAccessRole, string> = {
  viewer: 'Solo lectura',
  approver: 'Puede aprobar',
};

const ROLE_ICONS: Record<ClientAccessRole, React.ReactNode> = {
  viewer: <Eye className="w-3 h-3" />,
  approver: <CheckCircle className="w-3 h-3" />,
};

export function ClientAccessManager({ client, profile }: ClientAccessManagerProps) {
  const { accessRecords, loading, revokeAccess, updateRole } = useClientAccess(client.id);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const clientInitials = client.brand_name
    ? getInitials(client.brand_name)
    : getInitials(client.name);

  const handleRoleChange = async (accessId: string, newRole: ClientAccessRole) => {
    await updateRole(accessId, newRole);
  };

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src={client.logo_url || ''} alt={client.name} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-medium">
                {clientInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{client.brand_name || client.name}</CardTitle>
              <CardDescription>{client.name}</CardDescription>
              {client.contact_email && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  {client.contact_email}
                </div>
              )}
            </div>
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar usuario
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Access List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Usuarios con acceso</CardTitle>
            </div>
            <Badge variant="secondary">{accessRecords.length} usuarios</Badge>
          </div>
          <CardDescription>
            Usuarios que pueden ver y aprobar contenidos de este cliente en el portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : accessRecords.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/30">
              <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">
                Ningún usuario tiene acceso a este cliente
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Invita usuarios para que puedan revisar y aprobar contenidos.
              </p>
              <Button onClick={() => setInviteModalOpen(true)} variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Invitar primer usuario
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accessRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.user_profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {record.user_profile
                        ? getInitials(record.user_profile.display_name)
                        : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {record.user_profile?.display_name || 'Usuario desconocido'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {record.user_profile?.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {record.user_profile.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(record.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Role Selector */}
                    <Select
                      value={record.role}
                      onValueChange={(value) => handleRoleChange(record.id, value as ClientAccessRole)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue>
                          <div className="flex items-center gap-1.5">
                            {ROLE_ICONS[record.role]}
                            {ROLE_LABELS[record.role]}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5" />
                            Solo lectura
                          </div>
                        </SelectItem>
                        <SelectItem value="approver">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Puede aprobar
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {record.granter_profile && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        por {record.granter_profile.display_name}
                      </span>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Revocar acceso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {record.user_profile?.display_name || 'Este usuario'} ya no podrá ver ni aprobar contenidos de{' '}
                            {client.brand_name || client.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeAccess(record.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revocar acceso
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <InviteClientModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        client={client}
        profile={profile}
      />
    </div>
  );
}
