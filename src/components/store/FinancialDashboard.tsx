import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  Award,
  Calendar,
} from 'lucide-react';
import { CurrencyCode, FinancialSummary, ProductWithDetails, StoreSale } from '@/types/store';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface FinancialDashboardProps {
  summary: FinancialSummary;
  products: ProductWithDetails[];
  sales: StoreSale[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function FinancialDashboard({ summary, products, sales }: FinancialDashboardProps) {
  const formatCurrency = (value: number, currency: CurrencyCode = summary.currency) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const productById = new Map(products.map((p) => [p.id, p] as const));
  const convertToBase = (amount: number, from: CurrencyCode, exchangeRate: number) => {
    const rate = Number(exchangeRate) || 1;
    if (from === summary.currency) return amount;
    // Por ahora solo soportamos USD <-> DOP usando exchange_rate del producto.
    if (from === 'USD' && summary.currency === 'DOP') return amount * rate;
    if (from === 'DOP' && summary.currency === 'USD') return amount / rate;
    return amount;
  };

  // Datos para gráfico de productos por categoría
  const categoryData = products.reduce((acc, p) => {
    const cat = p.category;
    const existing = acc.find((item) => item.category === cat);
    if (existing) {
      existing.count += 1;
      existing.value += p.totalSold || 0;
    } else {
      acc.push({ category: cat, count: 1, value: p.totalSold || 0 });
    }
    return acc;
  }, [] as { category: string; count: number; value: number }[]);

  // Datos para gráfico de ventas por mes
  const monthlySalesData = sales.reduce((acc, sale) => {
    const month = sale.sale_date.substring(0, 7);
    const existing = acc.find((item) => item.month === month);
    const p = productById.get(sale.product_id);
    const fromCurrency = (p?.sale_currency || summary.currency) as CurrencyCode;
    const rate = Number(p?.exchange_rate) || 1;
    const saleValue = convertToBase(Number(sale.unit_price) * sale.quantity, fromCurrency, rate);
    if (existing) {
      existing.total += saleValue;
      existing.count += 1;
    } else {
      acc.push({ month, total: saleValue, count: 1 });
    }
    return acc;
  }, [] as { month: string; total: number; count: number }[]);

  monthlySalesData.sort((a, b) => a.month.localeCompare(b.month));

  // Top 5 productos por ganancia
  const topProducts = [...products]
    .sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Invertido</p>
                <p className="text-lg font-bold truncate">{formatCurrency(summary.totalInvested)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Vendido</p>
                <p className="text-lg font-bold truncate">{formatCurrency(summary.totalSold)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${summary.grossProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {summary.grossProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="min-w-0">
                 <p className="text-xs text-muted-foreground">Ganancia Neta</p>
                <p className={`text-lg font-bold truncate ${summary.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(summary.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Productos</p>
                <p className="text-lg font-bold">{summary.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose de inversión */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Desglose de Inversión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costo de productos</span>
              <span className="font-medium">{formatCurrency(summary.totalProductsCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costo de envíos</span>
              <span className="font-medium">{formatCurrency(summary.totalShippingCost)}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total invertido</span>
              <span className="font-bold text-primary">{formatCurrency(summary.totalInvested)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" />
              Destacados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.mostProfitableProduct ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Producto más rentable</p>
                  <p className="font-medium truncate">{summary.mostProfitableProduct.name}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {formatCurrency(summary.mostProfitableProduct.profit)}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de rentabilidad</p>
            )}
            {summary.mostProfitableMonth ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Mes más rentable</p>
                  <p className="font-medium">
                    {format(parseISO(summary.mostProfitableMonth.month + '-01'), 'MMMM yyyy', { locale: es })}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {formatCurrency(summary.mostProfitableMonth.profit)}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos mensuales</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Ventas por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySalesData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(parseISO(value + '-01'), 'MMM', { locale: es })}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const n = Number(value) || 0;
                        // Mantener el formato compacto, pero con la moneda correcta.
                        if (Math.abs(n) >= 1000) return `${formatCurrency(n / 1000)}k`;
                        return formatCurrency(n);
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => format(parseISO(label + '-01'), 'MMMM yyyy', { locale: es })}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sin ventas registradas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos por categoría */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="category"
                      label={({ category, count }) => `${category}: ${count}`}
                      labelLine={false}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sin productos registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top productos */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Productos por Ganancia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock} | Vendidos: {product.sales?.length || 0}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={product.grossProfit && product.grossProfit >= 0 ? 'default' : 'destructive'}
                  >
                    {formatCurrency(product.grossProfit || 0)}
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
