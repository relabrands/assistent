import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  StoreShippingCost,
  StoreProduct,
  ShippingStatus,
  CurrencyCode,
  SHIPPING_STATUS_LABELS,
  CURRENCY_LABELS,
} from '@/types/store';

interface ShippingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipping: StoreShippingCost | null;
  products: StoreProduct[];
  selectedProductId: string | null;
  onCreate: (data: Omit<StoreShippingCost, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
  onUpdate: (id: string, data: Partial<StoreShippingCost>) => Promise<void>;
}

export function ShippingModal({
  open,
  onOpenChange,
  shipping,
  products,
  selectedProductId,
  onCreate,
  onUpdate,
}: ShippingModalProps) {
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [shippingType, setShippingType] = useState('Envío 1');
  const [cost, setCost] = useState('');
  const [costCurrency, setCostCurrency] = useState<CurrencyCode>('USD');
  const [shippingDate, setShippingDate] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<ShippingStatus>('pendiente');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (shipping) {
      setProductId(shipping.product_id);
      setShippingType(shipping.shipping_type);
      setCost(String(shipping.cost));
      setCostCurrency((shipping.cost_currency as CurrencyCode) || 'USD');
      setShippingDate(shipping.shipping_date || '');
      setProvider(shipping.provider || '');
      setStatus(shipping.status);
      setNotes(shipping.notes || '');
    } else {
      setProductId(selectedProductId || '');
      setShippingType('Envío 1');
      setCost('');
      setCostCurrency('USD');
      setShippingDate('');
      setProvider('');
      setStatus('pendiente');
      setNotes('');
    }
  }, [shipping, selectedProductId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setSaving(true);
    try {
      const data = {
        product_id: productId,
        shipping_type: shippingType.trim() || 'Envío 1',
        cost: parseFloat(cost) || 0,
        cost_currency: costCurrency,
        shipping_date: shippingDate || null,
        provider: provider.trim() || null,
        status,
        notes: notes.trim() || null,
      };

      if (shipping) {
        await onUpdate(shipping.id, data);
      } else {
        await onCreate(data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 shrink-0 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {shipping ? 'Editar envío' : 'Nuevo envío'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shippingType">Tipo de envío</Label>
                <Input
                  id="shippingType"
                  value={shippingType}
                  onChange={(e) => setShippingType(e.target.value)}
                  placeholder="Ej: Envío 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={costCurrency} onValueChange={(v) => setCostCurrency(v as CurrencyCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shippingDate">Fecha</Label>
                <Input
                  id="shippingDate"
                  type="date"
                  value={shippingDate}
                  onChange={(e) => setShippingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ShippingStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHIPPING_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor de envío</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ej: DHL, Estafeta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !productId}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {shipping ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
