import { useState, useEffect, useMemo } from 'react';
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
  StoreSale,
  StoreProduct,
  StoreProductVariation,
  SaleStatus,
  PaymentMethod,
  SALE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/types/store';

interface SaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: StoreSale | null;
  products: StoreProduct[];
  variations: StoreProductVariation[];
  selectedProductId: string | null;
  onCreate: (data: Omit<StoreSale, 'id' | 'user_id' | 'created_at' | 'product' | 'variation'>) => Promise<any>;
  onUpdate: (id: string, data: Partial<StoreSale>) => Promise<void>;
}

export function SaleModal({
  open,
  onOpenChange,
  sale,
  products,
  variations,
  selectedProductId,
  onCreate,
  onUpdate,
}: SaleModalProps) {
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [variationId, setVariationId] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [status, setStatus] = useState<SaleStatus>('pagada');
  const [notes, setNotes] = useState('');

  const productVariations = useMemo(
    () => variations.filter((v) => v.product_id === productId),
    [variations, productId]
  );

  useEffect(() => {
    if (sale) {
      setProductId(sale.product_id);
      setVariationId(sale.variation_id || '');
      setSaleDate(sale.sale_date);
      setQuantity(String(sale.quantity));
      setUnitPrice(String(sale.unit_price));
      setClientName(sale.client_name || '');
      setClientContact(sale.client_contact || '');
      setPaymentMethod(sale.payment_method);
      setStatus(sale.status);
      setNotes(sale.notes || '');
    } else {
      setProductId(selectedProductId || '');
      setVariationId('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setQuantity('1');
      setUnitPrice('');
      setClientName('');
      setClientContact('');
      setPaymentMethod('efectivo');
      setStatus('pagada');
      setNotes('');
    }
  }, [sale, selectedProductId, open]);

  // Auto-fill price when product is selected
  useEffect(() => {
    if (!sale && productId) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setUnitPrice(String(product.price));
      }
    }
  }, [productId, products, sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !saleDate) return;

    setSaving(true);
    try {
      const data = {
        product_id: productId,
        variation_id: variationId || null,
        sale_date: saleDate,
        quantity: parseInt(quantity) || 1,
        unit_price: parseFloat(unitPrice) || 0,
        client_name: clientName.trim() || null,
        client_contact: clientContact.trim() || null,
        payment_method: paymentMethod,
        status,
        notes: notes.trim() || null,
      };

      if (sale) {
        await onUpdate(sale.id, data);
      } else {
        await onCreate(data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const total = (parseFloat(unitPrice) || 0) * (parseInt(quantity) || 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 shrink-0 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {sale ? 'Editar venta' : 'Nueva venta'}
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
                      {product.name} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {productVariations.length > 0 && (
              <div className="space-y-2">
                <Label>Variación (opcional)</Label>
                <Select value={variationId} onValueChange={setVariationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin variación específica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin variación específica</SelectItem>
                    {productVariations.map((variation) => (
                      <SelectItem key={variation.id} value={variation.id}>
                        {[variation.color, variation.size].filter(Boolean).join(' - ')} (Stock: {variation.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="saleDate">Fecha de venta *</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Precio unitario</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total */}
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Total de la venta</p>
              <p className="text-xl font-bold text-primary">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(total)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SALE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente (opcional)</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientContact">Contacto (opcional)</Label>
              <Input
                id="clientContact"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="Teléfono o email"
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
              <Button type="submit" className="flex-1" disabled={saving || !productId || !saleDate}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {sale ? 'Guardar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
