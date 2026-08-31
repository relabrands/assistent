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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Package, Truck, TrendingUp, DollarSign } from 'lucide-react';
import {
  StoreProduct,
  StoreShippingCost,
  ProductCategory,
  ProductStatus,
  ShippingStatus,
  CurrencyCode,
  CATEGORY_LABELS,
  PRODUCT_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
} from '@/types/store';

interface ShippingEntry {
  id?: string;
  shipping_type: string;
  cost: string;
  cost_currency: CurrencyCode;
  provider: string;
  shipping_date: string;
  status: ShippingStatus;
  notes: string;
  isNew?: boolean;
}

interface ProductInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: StoreProduct | null;
  existingShippingCosts: StoreShippingCost[];
  onCreate: (data: Omit<StoreProduct, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate: (id: string, data: Partial<StoreProduct>) => Promise<void>;
  onCreateShipping: (data: Omit<StoreShippingCost, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
  onUpdateShipping: (id: string, data: Partial<StoreShippingCost>) => Promise<void>;
  onDeleteShipping: (id: string) => Promise<void>;
}

export function ProductInvoiceModal({
  open,
  onOpenChange,
  product,
  existingShippingCosts,
  onCreate,
  onUpdate,
  onCreateShipping,
  onUpdateShipping,
  onDeleteShipping,
}: ProductInvoiceModalProps) {
  const [saving, setSaving] = useState(false);
  
  // Product fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('otros');
  const [cost, setCost] = useState('');
  const [costCurrency, setCostCurrency] = useState<CurrencyCode>('USD');
  const [price, setPrice] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<CurrencyCode>('DOP');
  const [exchangeRate, setExchangeRate] = useState('60');
  const [provider, setProvider] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [quantityPurchased, setQuantityPurchased] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState<ProductStatus>('activo');
  const [notes, setNotes] = useState('');
  
  // Shipping entries
  const [shippingEntries, setShippingEntries] = useState<ShippingEntry[]>([]);

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setCost(String(product.cost));
      setCostCurrency((product.cost_currency as CurrencyCode) || 'USD');
      setPrice(String(product.price));
      setSaleCurrency((product.sale_currency as CurrencyCode) || 'DOP');
      setExchangeRate(String(product.exchange_rate || 60));
      setProvider(product.provider || '');
      setPurchaseDate(product.purchase_date || '');
      setQuantityPurchased(String(product.quantity_purchased));
      setStock(String(product.stock));
      setStatus(product.status);
      setNotes(product.notes || '');
      
      // Load existing shipping costs
      const productShipping = existingShippingCosts.filter(s => s.product_id === product.id);
      setShippingEntries(productShipping.map(s => ({
        id: s.id,
        shipping_type: s.shipping_type,
        cost: String(s.cost),
        cost_currency: (s.cost_currency as CurrencyCode) || 'USD',
        provider: s.provider || '',
        shipping_date: s.shipping_date || '',
        status: s.status,
        notes: s.notes || '',
        isNew: false,
      })));
    } else {
      resetForm();
    }
  }, [product, existingShippingCosts, open]);

  const resetForm = () => {
    setName('');
    setCategory('otros');
    setCost('');
    setCostCurrency('USD');
    setPrice('');
    setSaleCurrency('DOP');
    setExchangeRate('60');
    setProvider('');
    setPurchaseDate('');
    setQuantityPurchased('');
    setStock('');
    setStatus('activo');
    setNotes('');
    setShippingEntries([]);
  };

  // Convert amount to sale currency
  const convertToSaleCurrency = (amount: number, fromCurrency: CurrencyCode): number => {
    const rate = parseFloat(exchangeRate) || 1;
    if (fromCurrency === saleCurrency) return amount;
    if (fromCurrency === 'USD' && saleCurrency === 'DOP') return amount * rate;
    if (fromCurrency === 'DOP' && saleCurrency === 'USD') return amount / rate;
    return amount;
  };

  // Calculated values
  const calculations = useMemo(() => {
    const productCostRaw = parseFloat(cost) || 0;
    const quantity = parseInt(quantityPurchased) || 1;
    const salePrice = parseFloat(price) || 0;
    const rate = parseFloat(exchangeRate) || 1;
    
    // Convert product cost to sale currency
    const productCostConverted = convertToSaleCurrency(productCostRaw, costCurrency);
    const totalProductCostConverted = productCostConverted * quantity;
    
    // Calculate shipping costs in sale currency
    let totalShippingConverted = 0;
    shippingEntries.forEach(entry => {
      const shippingCost = parseFloat(entry.cost) || 0;
      totalShippingConverted += convertToSaleCurrency(shippingCost, entry.cost_currency);
    });
    
    const totalInvestmentConverted = totalProductCostConverted + totalShippingConverted;
    const costPerUnitConverted = quantity > 0 ? totalInvestmentConverted / quantity : 0;
    const marginPerUnit = salePrice - costPerUnitConverted;
    const profitPercentage = costPerUnitConverted > 0 ? (marginPerUnit / costPerUnitConverted) * 100 : 0;

    return {
      productCostRaw,
      productCostConverted,
      totalProductCostConverted,
      totalShippingConverted,
      totalInvestmentConverted,
      costPerUnitConverted,
      marginPerUnit,
      profitPercentage,
      rate,
    };
  }, [cost, costCurrency, quantityPurchased, price, saleCurrency, exchangeRate, shippingEntries]);

  const addShippingEntry = () => {
    const newEntry: ShippingEntry = {
      shipping_type: `Envío ${shippingEntries.length + 1}`,
      cost: '',
      cost_currency: 'USD',
      provider: '',
      shipping_date: '',
      status: 'pendiente',
      notes: '',
      isNew: true,
    };
    setShippingEntries([...shippingEntries, newEntry]);
  };

  const updateShippingEntry = (index: number, field: keyof ShippingEntry, value: any) => {
    setShippingEntries(prev => 
      prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry)
    );
  };

  const removeShippingEntry = async (index: number) => {
    const entry = shippingEntries[index];
    if (entry.id && !entry.isNew) {
      await onDeleteShipping(entry.id);
    }
    setShippingEntries(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number, currency: CurrencyCode = saleCurrency) => {
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        category,
        cost: parseFloat(cost) || 0,
        price: parseFloat(price) || 0,
        cost_currency: costCurrency,
        sale_currency: saleCurrency,
        exchange_rate: parseFloat(exchangeRate) || 1,
        provider: provider.trim() || null,
        purchase_date: purchaseDate || null,
        quantity_purchased: parseInt(quantityPurchased) || 0,
        stock: parseInt(stock) || 0,
        status,
        image_url: null,
        notes: notes.trim() || null,
      };

      let productId = product?.id;

      if (product) {
        await onUpdate(product.id, productData);
      } else {
        const newProduct = await onCreate(productData);
        if (newProduct) {
          productId = newProduct.id;
        }
      }

      // Save shipping entries
      if (productId) {
        for (const entry of shippingEntries) {
          const shippingData = {
            product_id: productId,
            shipping_type: entry.shipping_type,
            cost: parseFloat(entry.cost) || 0,
            cost_currency: entry.cost_currency,
            provider: entry.provider.trim() || null,
            shipping_date: entry.shipping_date || null,
            status: entry.status,
            notes: entry.notes.trim() || null,
          };

          if (entry.id && !entry.isNew) {
            await onUpdateShipping(entry.id, shippingData);
          } else if (entry.isNew || !entry.id) {
            await onCreateShipping(shippingData);
          }
        }
      }

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 shrink-0 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            {product ? 'Editar factura de compra' : 'Nueva factura de compra'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Currency Settings */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Configuración de monedas
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Moneda de costos</Label>
                  <Select value={costCurrency} onValueChange={(v) => setCostCurrency(v as CurrencyCode)}>
                    <SelectTrigger className="h-9">
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

                <div className="space-y-1">
                  <Label className="text-xs">Moneda de venta</Label>
                  <Select value={saleCurrency} onValueChange={(v) => setSaleCurrency(v as CurrencyCode)}>
                    <SelectTrigger className="h-9">
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

                {costCurrency !== saleCurrency && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Tasa {costCurrency} → {saleCurrency}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      placeholder="60.00"
                      className="h-9"
                    />
                  </div>
                )}
              </div>

              {costCurrency !== saleCurrency && (
                <p className="text-xs text-muted-foreground">
                  1 {CURRENCY_SYMBOLS[costCurrency]} = {formatCurrency(parseFloat(exchangeRate) || 1, saleCurrency)}
                </p>
              )}
            </div>

            {/* Product Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                Información del producto
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del producto *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pulsera de plata"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cost">
                    Costo unitario ({CURRENCY_SYMBOLS[costCurrency]})
                  </Label>
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

                <div className="space-y-2">
                  <Label htmlFor="quantityPurchased">Cantidad comprada</Label>
                  <Input
                    id="quantityPurchased"
                    type="number"
                    min="1"
                    value={quantityPurchased}
                    onChange={(e) => setQuantityPurchased(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="provider">Proveedor</Label>
                  <Input
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Fecha de compra</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock disponible</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <Separator />

            {/* Shipping Costs Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  Costos de envío
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addShippingEntry}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar envío
                </Button>
              </div>

              {shippingEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay envíos registrados. Haz clic en "Agregar envío" para añadir uno.
                </p>
              ) : (
                <div className="space-y-4">
                  {shippingEntries.map((entry, index) => (
                    <div
                      key={entry.id || `new-${index}`}
                      className="p-3 border rounded-lg space-y-3 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {entry.shipping_type}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeShippingEntry(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Costo</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.cost}
                            onChange={(e) => updateShippingEntry(index, 'cost', e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Moneda</Label>
                          <Select
                            value={entry.cost_currency}
                            onValueChange={(v) => updateShippingEntry(index, 'cost_currency', v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
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
                        <div className="space-y-1">
                          <Label className="text-xs">Proveedor</Label>
                          <Input
                            value={entry.provider}
                            onChange={(e) => updateShippingEntry(index, 'provider', e.target.value)}
                            placeholder="DHL, Fedex..."
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="date"
                            value={entry.shipping_date}
                            onChange={(e) => updateShippingEntry(index, 'shipping_date', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Estado</Label>
                          <Select
                            value={entry.status}
                            onValueChange={(v) => updateShippingEntry(index, 'status', v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
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
                      
                      {entry.cost_currency !== saleCurrency && parseFloat(entry.cost) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(convertToSaleCurrency(parseFloat(entry.cost) || 0, entry.cost_currency), saleCurrency)} en moneda de venta
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Pricing & Profit Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                Precio de venta y ganancia
              </h3>

              <div className="space-y-2">
                <Label htmlFor="price">
                  Precio de venta unitario ({CURRENCY_SYMBOLS[saleCurrency]})
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Calculations Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium">Resumen de costos (en {CURRENCY_SYMBOLS[saleCurrency]})</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Costo productos ({calculations.productCostRaw.toFixed(2)} {CURRENCY_SYMBOLS[costCurrency]} × {quantityPurchased || 1}):
                    </span>
                    <span className="font-medium">{formatCurrency(calculations.totalProductCostConverted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo envíos ({shippingEntries.length}):</span>
                    <span className="font-medium">{formatCurrency(calculations.totalShippingConverted)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total invertido:</span>
                  <span className="font-bold text-primary">{formatCurrency(calculations.totalInvestmentConverted)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo por unidad:</span>
                  <span className="font-medium">{formatCurrency(calculations.costPerUnitConverted)}</span>
                </div>

                {parseFloat(price) > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Margen por unidad:</span>
                        <span className={`font-bold ${calculations.marginPerUnit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {formatCurrency(calculations.marginPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">% de ganancia:</span>
                        <Badge
                          variant={calculations.profitPercentage >= 0 ? 'default' : 'destructive'}
                          className="text-lg px-3 py-1"
                        >
                          {calculations.profitPercentage >= 0 ? '+' : ''}{calculations.profitPercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre esta compra..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {product ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
