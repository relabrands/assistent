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
import { MoreVertical, Edit, Trash2, Truck } from 'lucide-react';
import {
  StoreShippingCost,
  StoreProduct,
  SHIPPING_STATUS_LABELS,
} from '@/types/store';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShippingTabProps {
  shippingCosts: StoreShippingCost[];
  products: StoreProduct[];
  onEdit: (shipping: StoreShippingCost) => void;
  onDelete: (id: string) => void;
}

export function ShippingTab({
  shippingCosts,
  products,
  onEdit,
  onDelete,
}: ShippingTabProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Producto eliminado';
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (shippingCosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Truck className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay envíos</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega un envío desde la tarjeta de un producto
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {shippingCosts.map((shipping) => (
          <Card key={shipping.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {shipping.shipping_type}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getProductName(shipping.product_id)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-primary">
                    {formatCurrency(Number(shipping.cost))}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(shipping)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(shipping.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant={shipping.status === 'pagado' ? 'default' : 'secondary'}
                >
                  {SHIPPING_STATUS_LABELS[shipping.status]}
                </Badge>
                {shipping.shipping_date && (
                  <span className="text-muted-foreground">
                    {format(parseISO(shipping.shipping_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                )}
                {shipping.provider && (
                  <span className="text-muted-foreground">• {shipping.provider}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar envío?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
