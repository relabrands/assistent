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
import { MoreVertical, Edit, Trash2, ShoppingCart } from 'lucide-react';
import {
  StoreSale,
  StoreProduct,
  SALE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/types/store';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesTabProps {
  sales: StoreSale[];
  products: StoreProduct[];
  onEdit: (sale: StoreSale) => void;
  onDelete: (id: string) => void;
}

export function SalesTab({ sales, products, onEdit, onDelete }: SalesTabProps) {
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

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay ventas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Registra tu primera venta desde la tarjeta de un producto
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sales.map((sale) => {
          const total = Number(sale.unit_price) * sale.quantity;

          return (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                      <ShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {getProductName(sale.product_id)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {sale.quantity} × {formatCurrency(Number(sale.unit_price))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(total)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(sale)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(sale.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant={
                      sale.status === 'pagada'
                        ? 'default'
                        : sale.status === 'cancelada'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {SALE_STATUS_LABELS[sale.status]}
                  </Badge>
                  <Badge variant="outline">
                    {PAYMENT_METHOD_LABELS[sale.payment_method]}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(parseISO(sale.sale_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  {sale.client_name && (
                    <span className="text-muted-foreground">• {sale.client_name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
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
