import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Boxes,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
} from 'lucide-react';
import { CurrencyCode, ProductWithDetails, CATEGORY_LABELS } from '@/types/store';

interface InventoryReportProps {
  products: ProductWithDetails[];
  currency: CurrencyCode;
  lowStockThreshold?: number;
}

export function InventoryReport({
  products,
  currency,
  lowStockThreshold = 3,
}: InventoryReportProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Calculate inventory metrics
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  
  const inventoryValue = products.reduce((sum, p) => {
    const costPerUnit = p.costPerUnitConverted || p.averageUnitCostConverted || 0;
    return sum + (costPerUnit * (p.stock || 0));
  }, 0);

  const inventorySaleValue = products.reduce((sum, p) => {
    return sum + (Number(p.price) * (p.stock || 0));
  }, 0);

  const potentialProfit = inventorySaleValue - inventoryValue;

  const avgCostPerUnit = totalStock > 0 
    ? inventoryValue / totalStock 
    : 0;

  const avgPricePerUnit = totalStock > 0 
    ? inventorySaleValue / totalStock 
    : 0;

  // Low stock products
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= lowStockThreshold && p.status !== 'descontinuado'
  );

  // Out of stock products
  const outOfStockProducts = products.filter(
    (p) => p.stock === 0 && p.status !== 'descontinuado'
  );

  // Active products count
  const activeProducts = products.filter((p) => p.status === 'activo').length;

  // Stock by category
  const stockByCategory = products.reduce((acc, p) => {
    const cat = p.category;
    const existing = acc.find((item) => item.category === cat);
    if (existing) {
      existing.stock += p.stock || 0;
      existing.value += (p.costPerUnitConverted || p.averageUnitCostConverted || 0) * (p.stock || 0);
      existing.count += 1;
    } else {
      acc.push({
        category: cat,
        stock: p.stock || 0,
        value: (p.costPerUnitConverted || p.averageUnitCostConverted || 0) * (p.stock || 0),
        count: 1,
      });
    }
    return acc;
  }, [] as { category: string; stock: number; value: number; count: number }[]);

  // Top products by stock value
  const topByValue = [...products]
    .map((p) => ({
      ...p,
      stockValue: (p.costPerUnitConverted || p.averageUnitCostConverted || 0) * (p.stock || 0),
    }))
    .filter((p) => p.stockValue > 0)
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Alerta de stock bajo */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Alertas de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outOfStockProducts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  ⛔ Sin stock ({outOfStockProducts.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {outOfStockProducts.slice(0, 5).map((p) => (
                    <Badge key={p.id} variant="destructive" className="text-xs">
                      {p.name}
                    </Badge>
                  ))}
                  {outOfStockProducts.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{outOfStockProducts.length - 5} más
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  ⚠️ Stock bajo ({lowStockProducts.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lowStockProducts.map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-xs gap-1">
                      {p.name}
                      <span className="font-bold text-amber-600">({p.stock})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs de inventario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Unidades en Stock</p>
                <p className="text-lg font-bold">{totalStock.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Valor del Inventario</p>
                <p className="text-lg font-bold truncate">{formatCurrency(inventoryValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Valor Venta Potencial</p>
                <p className="text-lg font-bold truncate">{formatCurrency(inventorySaleValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ganancia Potencial</p>
                <p className={`text-lg font-bold truncate ${potentialProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(potentialProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalles y distribución */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Promedios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Promedios de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costo promedio/unidad</span>
              <span className="font-medium">{formatCurrency(avgCostPerUnit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Precio venta prom./unidad</span>
              <span className="font-medium">{formatCurrency(avgPricePerUnit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Margen promedio</span>
              <Badge variant={avgPricePerUnit - avgCostPerUnit >= 0 ? 'default' : 'destructive'}>
                {formatCurrency(avgPricePerUnit - avgCostPerUnit)}
              </Badge>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Productos activos</span>
              <span className="font-medium">{activeProducts} / {products.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stock por categoría */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              Stock por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockByCategory.length > 0 ? (
              stockByCategory.map((cat) => {
                const percentage = totalStock > 0 ? (cat.stock / totalStock) * 100 : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{CATEGORY_LABELS[cat.category as keyof typeof CATEGORY_LABELS] || cat.category}</span>
                      <span className="text-muted-foreground">
                        {cat.stock} uds ({cat.count} productos)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin productos en inventario
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top productos por valor */}
      {topByValue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Mayor Valor en Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topByValue.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock} × {formatCurrency(product.costPerUnitConverted || product.averageUnitCostConverted || 0)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {formatCurrency(product.stockValue)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
