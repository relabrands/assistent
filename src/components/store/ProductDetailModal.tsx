import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, History, TrendingUp, Palette } from 'lucide-react';
import {
  ProductWithDetails,
  StorePurchase,
  StoreProductVariation,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRODUCT_STATUS_LABELS,
  CurrencyCode,
} from '@/types/store';
import { PurchaseHistoryTable } from './PurchaseHistoryTable';
import { VariationsTable } from './VariationsTable';

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithDetails | null;
  variations: StoreProductVariation[];
  onAddPurchase: (productId: string) => void;
  onEditPurchase: (purchase: StorePurchase) => void;
  onDeletePurchase: (id: string) => void;
  onAddVariation: (productId: string) => void;
  onEditVariation: (variation: StoreProductVariation) => void;
  onDeleteVariation: (id: string) => void;
}

export function ProductDetailModal({
  open,
  onOpenChange,
  product,
  variations,
  onAddPurchase,
  onEditPurchase,
  onDeletePurchase,
  onAddVariation,
  onEditVariation,
  onDeleteVariation,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState('purchases');

  if (!product) return null;

  const formatCurrency = (value: number, currency: CurrencyCode = product.sale_currency || 'DOP') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const purchases = product.purchases || [];
  const saleCurrency = (product.sale_currency || 'DOP') as CurrencyCode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{CATEGORY_ICONS[product.category]}</span>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">{product.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[product.category]}
                </Badge>
                <Badge
                  variant={
                    product.status === 'activo'
                      ? 'default'
                      : product.status === 'agotado'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {PRODUCT_STATUS_LABELS[product.status]}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Product Stats */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Stock</p>
            <p className="text-lg font-bold">{product.stock}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Comprados</p>
            <p className="text-lg font-bold">{product.quantity_purchased}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Costo Prom.</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(product.averageUnitCostConverted || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Precio Venta</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(Number(product.price))}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="shrink-0 w-full justify-start gap-1 bg-muted/50 p-1 h-auto">
            <TabsTrigger value="purchases" className="gap-1.5 text-xs">
              <History className="w-3.5 h-3.5" />
              Compras ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="variations" className="gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5" />
              Variaciones ({variations.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              Estadísticas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="purchases" className="m-0 h-full">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onAddPurchase(product.id)}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Compra
                  </Button>
                </div>
                <PurchaseHistoryTable
                  purchases={purchases}
                  saleCurrency={saleCurrency}
                  onEdit={onEditPurchase}
                  onDelete={onDeletePurchase}
                />
              </div>
            </TabsContent>

            <TabsContent value="variations" className="m-0 h-full">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onAddVariation(product.id)}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Variación
                  </Button>
                </div>
                <VariationsTable
                  variations={variations}
                  onEdit={onEditVariation}
                  onDelete={onDeleteVariation}
                />
              </div>
            </TabsContent>

            <TabsContent value="stats" className="m-0">
              <div className="space-y-4">
                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Total Invertido</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(product.totalInvestedConverted || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Total Vendido</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(product.totalSold || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Ganancia Bruta</p>
                    <p className={`text-xl font-bold ${(product.grossProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(product.grossProfit || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">% Ganancia</p>
                    <p className={`text-xl font-bold ${(product.profitPercentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(product.profitPercentage || 0) >= 0 ? '+' : ''}
                      {(product.profitPercentage || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Desglose de Costos
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Costo promedio/unidad</span>
                      <span className="font-medium">{formatCurrency(product.averageUnitCostConverted || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envíos ({product.shippingCosts?.length || 0})</span>
                      <span className="font-medium">{formatCurrency(product.totalShippingCostConverted || 0)}</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between">
                      <span className="font-medium">Costo total/unidad</span>
                      <span className="font-bold text-primary">{formatCurrency(product.costPerUnitConverted || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Margen/unidad</span>
                      <span className={`font-bold ${(product.marginPerUnit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(product.marginPerUnit || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Provider info */}
                {product.provider && (
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Proveedor Principal</p>
                    <p className="font-medium">{product.provider}</p>
                  </div>
                )}

                {/* Notes */}
                {product.notes && (
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm">{product.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
