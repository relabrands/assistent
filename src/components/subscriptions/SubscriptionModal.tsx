import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionCurrency,
  SubscriptionCategory,
  SUBSCRIPTION_PRESETS,
  CATEGORY_CONFIG,
  BILLING_CYCLE_LABELS,
} from '@/types/subscription';
import { Project, Profile } from '@/types/database';
import {
  CreditCard,
  Building2,
  User,
  Calendar,
  DollarSign,
  Globe,
  Mail,
  Sparkles,
  Bot,
  Palette,
  Server,
  FileText,
  Code,
  Music,
  Crown,
  FolderKanban,
} from 'lucide-react';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  projects: Project[];
  profiles: Profile[];
  currentProfileId?: string;
  onSave: (
    data: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) => Promise<any>;
}

export function SubscriptionModal({
  open,
  onOpenChange,
  subscription,
  projects,
  profiles,
  currentProfileId,
  onSave,
}: SubscriptionModalProps) {
  const isEditing = !!subscription;

  const [name, setName] = useState('');
  const [cost, setCost] = useState<string>('');
  const [currency, setCurrency] = useState<SubscriptionCurrency>('USD');
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>('monthly');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [category, setCategory] = useState<SubscriptionCategory>('software');
  const [paymentDay, setPaymentDay] = useState<string>('1');
  const [nextPaymentDate, setNextPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [ownerId, setOwnerId] = useState<string>(currentProfileId || 'none');
  const [ownerName, setOwnerName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subscription) {
      setName(subscription.name || '');
      setCost(subscription.cost ? String(subscription.cost) : '');
      setCurrency(subscription.currency || 'USD');
      setBillingCycle(subscription.billing_cycle || 'monthly');
      setStatus(subscription.status || 'active');
      setCategory(subscription.category || 'software');
      setPaymentDay(subscription.payment_day ? String(subscription.payment_day) : '1');
      setNextPaymentDate(subscription.next_payment_date || '');
      setPaymentMethod(subscription.payment_method || '');
      setProjectId(subscription.project_id || 'none');
      setOwnerId(subscription.owner_id || 'none');
      setOwnerName(subscription.owner_name || '');
      setWebsiteUrl(subscription.website_url || '');
      setLoginEmail(subscription.login_email || '');
      setNotes(subscription.notes || '');
    } else {
      // Defaults for new
      setName('');
      setCost('');
      setCurrency('USD');
      setBillingCycle('monthly');
      setStatus('active');
      setCategory('software');
      setPaymentDay(String(new Date().getDate()));
      setNextPaymentDate('');
      setPaymentMethod('');
      setProjectId('none');
      setOwnerId(currentProfileId || 'none');
      const me = profiles.find((p) => p.id === currentProfileId);
      setOwnerName(me?.display_name || '');
      setWebsiteUrl('');
      setLoginEmail(me?.email || '');
      setNotes('');
    }
  }, [subscription, open, currentProfileId, profiles]);

  const handleApplyPreset = (preset: typeof SUBSCRIPTION_PRESETS[0]) => {
    setName(preset.name);
    setCategory(preset.category);
    setCurrency(preset.defaultCurrency);
    setBillingCycle(preset.defaultBillingCycle);
    if (preset.websiteUrl) setWebsiteUrl(preset.websiteUrl);
  };

  const handleOwnerChange = (val: string) => {
    setOwnerId(val);
    if (val === 'none') {
      setOwnerName('');
    } else {
      const p = profiles.find((item) => item.id === val);
      if (p) setOwnerName(p.display_name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedCost = parseFloat(cost) || 0;
    const parsedDay = parseInt(paymentDay, 10) || null;

    setIsSubmitting(true);
    try {
      const data: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
        name: name.trim(),
        cost: parsedCost,
        currency,
        billing_cycle: billingCycle,
        status,
        category,
        payment_day: parsedDay,
        next_payment_date: nextPaymentDate || null,
        payment_method: paymentMethod.trim() || null,
        project_id: projectId === 'none' ? null : projectId,
        owner_id: ownerId === 'none' ? null : ownerId,
        owner_name: ownerName.trim() || null,
        website_url: websiteUrl.trim() || null,
        login_email: loginEmail.trim() || null,
        notes: notes.trim() || null,
      };

      await onSave(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span>{isEditing ? 'Editar Suscripción' : 'Nueva Suscripción'}</span>
          </DialogTitle>
        </DialogHeader>

        {!isEditing && (
          <div className="space-y-1.5 pb-2 border-b">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Sugerencias rápidas:
            </Label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {SUBSCRIPTION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 text-xs rounded-full border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nombre y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name" className="text-xs font-semibold">
                Nombre del servicio *
              </Label>
              <Input
                id="sub-name"
                placeholder="Ej. ChatGPT Plus, Figma, Google Workspace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría</Label>
              <Select value={category} onValueChange={(val) => setCategory(val as SubscriptionCategory)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className={cfg.color}>{cfg.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Costo, Moneda y Ciclo */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border">
            <div className="space-y-1.5">
              <Label htmlFor="sub-cost" className="text-xs font-semibold">
                Costo *
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">
                  {currency === 'USD' ? '$' : currency === 'DOP' ? 'RD$' : '€'}
                </span>
                <Input
                  id="sub-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="h-9 pl-8 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Moneda</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val as SubscriptionCurrency)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="DOP">DOP (RD$)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Frecuencia</Label>
              <Select
                value={billingCycle}
                onValueChange={(val) => setBillingCycle(val as SubscriptionBillingCycle)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BILLING_CYCLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-day" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Día del mes de cobro (1 - 31)
              </Label>
              <Input
                id="sub-day"
                type="number"
                min="1"
                max="31"
                placeholder="Ej. 15"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Día en que se realiza el débito automáticamente cada mes.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-next-date" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Próxima fecha exacta (opcional)
              </Label>
              <Input
                id="sub-next-date"
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Útil para cobros anuales o fechas específicas de renovación.
              </p>
            </div>
          </div>

          {/* Proyecto y Responsable ("De quién es" y "De qué proyecto") */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-primary" />
                Proyecto registrado
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / Sin proyecto específico</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      <div className="flex items-center gap-2">
                        {proj.color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color }}
                          />
                        )}
                        <span className="truncate">{proj.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                ¿De quién es? (Responsable)
              </Label>
              <Select value={ownerId} onValueChange={handleOwnerChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar miembro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Empresa / General</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.display_name}</span>
                        {p.email && (
                          <span className="text-[10px] text-muted-foreground">({p.email})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estado y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estado de la suscripción</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as SubscriptionStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">🟢 Activa (Pagándose)</SelectItem>
                  <SelectItem value="trial">🟡 Prueba Gratuita</SelectItem>
                  <SelectItem value="paused">🔵 Pausada temporalmente</SelectItem>
                  <SelectItem value="cancelled">🔴 Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-method" className="text-xs font-semibold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                Método de pago
              </Label>
              <Input
                id="sub-method"
                placeholder="Ej. Visa Popular *4092, PayPal, BHD"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Enlace y Correo de acceso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-url" className="text-xs font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                Sitio web / Panel de login
              </Label>
              <Input
                id="sub-url"
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Correo de la cuenta
              </Label>
              <Input
                id="sub-email"
                type="email"
                placeholder="ejemplo@relabrands.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="sub-notes" className="text-xs font-semibold">
              Notas adicionales
            </Label>
            <Textarea
              id="sub-notes"
              placeholder="Detalles del plan (ej. 5 puestos de equipo), fechas para cancelar antes del cobro, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar Suscripción'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
