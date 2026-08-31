import { useEffect, useMemo, useState } from 'react';
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
  CurrencyCode,
  CURRENCY_LABELS,
  StoreProduct,
  StorePurchase,
  StoreProductVariation,
} from '@/types/store';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: StoreProduct[];
  variations: StoreProductVariation[];
  selectedProductId: string | null;
  onCreate: (data: Omit<StorePurchase, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
}

export function PurchaseModal({
  open,
  onOpenChange,
  products,
  variations,
  selectedProductId,
  onCreate,
}: PurchaseModalProps) {
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [variationId, setVariationId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [costCurrency, setCostCurrency] = useState<CurrencyCode>('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

  const productVariations = useMemo(
    () => variations.filter((v) => v.product_id === productId),
    [variations, productId]
  );

  useEffect(() => {
    if (!open) return;
    const initialProductId = selectedProductId || '';
    setProductId(initialProductId);
    setVariationId('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setQuantity('1');
    setUnitCost('');
    setShippingCost('');
    setCostCurrency('USD');
    // Default to product exchange rate if available
    const product = products.find((p) => p.id === initialProductId);
    setExchangeRate(String(Number(product?.exchange_rate) || 1));
    setProvider('');
    setNotes('');
  }, [open, selectedProductId, products]);

  // Keep exchange rate in sync when selecting product
  useEffect(() => {
    if (!open) return;
    if (!selectedProduct) return;
    if (costCurrency === 'USD') {
      setExchangeRate(String(Number(selectedProduct.exchange_rate) || 1));
    } else {
      setExchangeRate('1');
    }
  }, [selectedProduct, costCurrency, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setSaving(true);
    try {
      const qty = Math.max(1, parseInt(quantity) || 1);
      const unit = Math.max(0, parseFloat(unitCost) || 0);
      const shipping = Math.max(0, parseFloat(shippingCost) || 0);
      const rate = costCurrency === 'USD' ? Math.max(0.0001, parseFloat(exchangeRate) || 1) : 1;

      await onCreate({
        product_id: productId,
        variation_id: variationId || null,
        quantity: qty,
        unit_cost: unit,
        shipping_cost: shipping,
        cost_currency: costCurrency,
        exchange_rate: rate,
        provider: provider.trim() || null,
        purchase_date: purchaseDate || null,
        notes: notes.trim() || null,
      });

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
            Añadir compra
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
                        {[variation.color, variation.size].filter(Boolean).join(' - ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Fecha</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Costo unitario</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCost">Costo de envío</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Moneda (costo + envío)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="exchangeRate">
                Tasa de cambio {costCurrency === 'USD' ? '(USD → DOP)' : ''}
              </Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                min="0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                disabled={costCurrency !== 'USD'}
              />
              <p className="text-xs text-muted-foreground">
                Se usa para convertir el costo de esta compra al cálculo en RD$.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ej: Proveedor A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de la compra..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !productId}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Agregar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
