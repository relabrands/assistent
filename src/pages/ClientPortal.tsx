import { useClientPortal } from '@/hooks/useClientPortal';
import { ClientAuthForm } from '@/components/clients/ClientAuthForm';
import { ClientPortalDashboard } from '@/components/clients/ClientPortalDashboard';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ClientPortal = () => {
  const { 
    isAuthenticated, 
    loading, 
    profile, 
    clients, 
    hasClientAccess,
    signOut 
  } = useClientPortal();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ClientAuthForm />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/50 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Error de perfil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No se pudo cargar tu perfil. Por favor, intenta de nuevo.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasClientAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500/50 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Sin acceso asignado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tu cuenta no tiene acceso a ninguna marca o cliente todavía. 
              Contacta a tu agencia o gestor de contenidos.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientPortalDashboard
      profile={profile}
      clients={clients}
      onSignOut={() => signOut()}
    />
  );
};

export default ClientPortal;
