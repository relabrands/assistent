import { useState } from 'react';
import { Client } from '@/types/content';
import { Profile } from '@/types/database';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Mail, CheckCircle, Eye } from 'lucide-react';
import { ClientAccessRole } from '@/hooks/useClientAccess';

interface InviteClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  profile: Profile;
}

export function InviteClientModal({
  open,
  onOpenChange,
  client,
  profile,
}: InviteClientModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClientAccessRole>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const initials = client.brand_name 
    ? client.brand_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      // Find if profile exists for this email
      const q = query(collection(db, 'profiles'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      let targetUserId = '';
      if (!snap.empty) {
        targetUserId = snap.docs[0].id;
      } else {
        targetUserId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      }

      await addDoc(collection(db, 'client_access'), {
        client_id: client.id,
        user_id: targetUserId,
        email: cleanEmail,
        granted_by: profile.id,
        role: role,
        created_at: new Date().toISOString(),
      });

      setIsSuccess(true);
      toast({
        title: 'Acceso otorgado',
        description: `Se registró el acceso para ${cleanEmail}`,
      });
    } catch (error: any) {
      console.error('Error inviting client:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el acceso',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setIsSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invitar cliente
          </DialogTitle>
          <DialogDescription>
            Envía acceso al portal de clientes para que pueda revisar y aprobar contenidos.
          </DialogDescription>
        </DialogHeader>

        {/* Client Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={client.logo_url || ''} alt={client.name} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{client.brand_name || client.name}</p>
            <p className="text-sm text-muted-foreground">{client.name}</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-1">¡Invitación registrada!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              El cliente ya tiene acceso configurado para este proyecto.
            </p>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-email">Email del cliente</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permisos</Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as ClientAccessRole)}
                className="grid grid-cols-2 gap-3"
              >
                <div>
                  <RadioGroupItem
                    value="viewer"
                    id="role-viewer"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="role-viewer"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <Eye className="w-5 h-5 mb-1.5" />
                    <span className="text-sm font-medium">Solo lectura</span>
                    <span className="text-xs text-muted-foreground text-center mt-0.5">
                      Puede ver contenidos
                    </span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="approver"
                    id="role-approver"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="role-approver"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <CheckCircle className="w-5 h-5 mb-1.5" />
                    <span className="text-sm font-medium">Puede aprobar</span>
                    <span className="text-xs text-muted-foreground text-center mt-0.5">
                      Puede aprobar/rechazar
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar acceso
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
