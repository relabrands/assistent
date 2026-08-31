import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Edit, Trash2, Truck, ShoppingCart, Package, PackagePlus, Eye } from 'lucide-react';
import {
  ProductWithDetails,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRODUCT_STATUS_LABELS,
  StoreProduct,
  CurrencyCode,
} from '@/types/store';
import { useState } from 'react';

interface ProductsTabProps {
  products: ProductWithDetails[];
  onEdit: (product: StoreProduct) => void;
  onDelete: (id: string) => void;
  onViewDetail: (product: ProductWithDetails) => void;
  onNewShipping: (productId: string) => void;
  onNewSale: (productId: string) => void;
  onNewPurchase: (productId: string) => void;
}

export function ProductsTab({
  products,
  onEdit,
  onDelete,
  onViewDetail,
  onNewShipping,
  onNewSale,
  onNewPurchase,
}: ProductsTabProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      // Fallback (no debería usarse en el render principal)
      currency: 'DOP',
    }).format(value);
  };

  const formatMoney = (value: number, currency: CurrencyCode) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay productos</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega tu primer producto para empezar
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-2xl">{CATEGORY_ICONS[product.category]}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[product.category]}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetail(product)}>
                      <Eye className="w-4 h-4 mr-2" /> Ver detalle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewPurchase(product.id)}>
                      <PackagePlus className="w-4 h-4 mr-2" /> Añadir compra
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewShipping(product.id)}>
                      <Truck className="w-4 h-4 mr-2" /> Agregar envío
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewSale(product.id)}>
                      <ShoppingCart className="w-4 h-4 mr-2" /> Registrar venta
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteId(product.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Costo prom.:</span>
                  <span className="ml-1 font-medium">
                    {formatMoney(
                      Number(product.averageUnitCostConverted ?? product.costPerUnitConverted ?? 0),
                      product.sale_currency || 'DOP'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio venta:</span>
                  <span className="ml-1 font-medium text-primary">
                    {formatMoney(Number(product.price), product.sale_currency || 'DOP')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock:</span>
                  <span className="ml-1 font-medium">{product.stock}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Comprados:</span>
                  <span className="ml-1 font-medium">{product.quantity_purchased}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Envíos ({product.shippingCosts?.length || 0}):</span>
                  <span className="font-medium">
                    {formatMoney(product.totalShippingCostConverted || 0, product.sale_currency || 'DOP')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Costo total/unidad:</span>
                  <span className="font-medium">
                    {formatMoney(product.costPerUnitConverted || 0, product.sale_currency || 'DOP')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Margen/unidad:</span>
                  <span
                    className={`font-medium ${
                      (product.marginPerUnit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {formatMoney(product.marginPerUnit || 0, product.sale_currency || 'DOP')}
                  </span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-muted-foreground">% Ganancia:</span>
                  <Badge
                    variant={(product.profitPercentage || 0) >= 0 ? 'default' : 'destructive'}
                    className="text-xs h-5"
                  >
                    {(product.profitPercentage || 0) >= 0 ? '+' : ''}{(product.profitPercentage || 0).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
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
                {product.provider && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {product.provider}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todos los envíos y ventas asociados a este producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
