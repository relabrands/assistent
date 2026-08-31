import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Edit, Trash2, Package, Search } from 'lucide-react';
import { StorePurchase, StoreProduct, CURRENCY_SYMBOLS, CurrencyCode } from '@/types/store';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchasesTabProps {
  purchases: StorePurchase[];
  products: StoreProduct[];
  onEdit: (purchase: StorePurchase) => void;
  onDelete: (id: string) => void;
}

export function PurchasesTab({
  purchases,
  products,
  onEdit,
  onDelete,
}: PurchasesTabProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const formatCurrency = (value: number, currency: CurrencyCode) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Producto eliminado';
  };

  const getProductSaleCurrency = (productId: string): CurrencyCode => {
    const product = products.find((p) => p.id === productId);
    return (product?.sale_currency as CurrencyCode) || 'DOP';
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  // Sort purchases by date (most recent first)
  const sortedPurchases = [...purchases].sort((a, b) => {
    const dateA = a.purchase_date || a.created_at;
    const dateB = b.purchase_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Filter by search
  const filteredPurchases = sortedPurchases.filter((purchase) => {
    const productName = getProductName(purchase.product_id).toLowerCase();
    const provider = (purchase.provider || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return productName.includes(searchLower) || provider.includes(searchLower);
  });

  // Calculate totals
  const totalQuantity = filteredPurchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalInvested = filteredPurchases.reduce((sum, p) => {
    const saleCurrency = getProductSaleCurrency(p.product_id);
    const rate = Number(p.exchange_rate) || 1;
    const unitCost = Number(p.unit_cost) || 0;
    const qty = Number(p.quantity) || 0;
    const shippingCost = Number(p.shipping_cost) || 0;
    const total = (unitCost * qty) + shippingCost;
    const fromCurrency = p.cost_currency || 'USD';

    if (fromCurrency === saleCurrency) {
      return sum + total;
    }
    if (fromCurrency === 'USD' && saleCurrency === 'DOP') {
      return sum + (total * rate);
    }
    if (fromCurrency === 'DOP' && saleCurrency === 'USD') {
      return sum + (total / rate);
    }
    return sum + total;
  }, 0);

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Sin compras registradas</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Registra compras desde el detalle de cada producto para ver el historial aquí
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and summary */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Compras:</span>
              <Badge variant="secondary">{filteredPurchases.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Unidades:</span>
              <Badge variant="secondary">{totalQuantity}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <Badge variant="default" className="bg-primary">
                {formatCurrency(totalInvested, 'DOP')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Envío</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => {
                const saleCurrency = getProductSaleCurrency(purchase.product_id);
                const rate = Number(purchase.exchange_rate) || 1;
                const unitCost = Number(purchase.unit_cost) || 0;
                const qty = Number(purchase.quantity) || 0;
                const shippingCost = Number(purchase.shipping_cost) || 0;
                const total = (unitCost * qty) + shippingCost;
                const fromCurrency = (purchase.cost_currency || 'USD') as CurrencyCode;

                let totalConverted = total;
                if (fromCurrency !== saleCurrency) {
                  if (fromCurrency === 'USD' && saleCurrency === 'DOP') {
                    totalConverted = total * rate;
                  } else if (fromCurrency === 'DOP' && saleCurrency === 'USD') {
                    totalConverted = total / rate;
                  }
                }

                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-sm">
                      {purchase.purchase_date
                        ? format(parseISO(purchase.purchase_date), 'dd MMM yy', { locale: es })
                        : format(parseISO(purchase.created_at), 'dd MMM yy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getProductName(purchase.product_id)}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{qty}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm">
                          {CURRENCY_SYMBOLS[fromCurrency]}{unitCost.toFixed(2)}
                        </span>
                        {fromCurrency !== saleCurrency && (
                          <span className="text-xs text-muted-foreground">
                            @{rate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {shippingCost > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {CURRENCY_SYMBOLS[fromCurrency]}{shippingCost.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.provider ? (
                        <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                          {purchase.provider}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(totalConverted, saleCurrency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(purchase)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(purchase.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se actualizará el stock del producto automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
