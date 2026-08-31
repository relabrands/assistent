import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Edit, Trash2, Package } from 'lucide-react';
import { StorePurchase, CurrencyCode, CURRENCY_SYMBOLS } from '@/types/store';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseHistoryTableProps {
  purchases: StorePurchase[];
  saleCurrency: CurrencyCode;
  onEdit: (purchase: StorePurchase) => void;
  onDelete: (id: string) => void;
}

export function PurchaseHistoryTable({
  purchases,
  saleCurrency,
  onEdit,
  onDelete,
}: PurchaseHistoryTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number, currency: CurrencyCode) => {
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

  // Sort purchases by date (most recent first)
  const sortedPurchases = [...purchases].sort((a, b) => {
    const dateA = a.purchase_date || a.created_at;
    const dateB = b.purchase_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Calculate totals
  const totalQuantity = purchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalShipping = purchases.reduce((sum, p) => {
    const rate = Number(p.exchange_rate) || 1;
    const shippingCost = Number(p.shipping_cost) || 0;
    const fromCurrency = p.cost_currency || 'USD';
    
    if (fromCurrency === saleCurrency) {
      return sum + shippingCost;
    }
    if (fromCurrency === 'USD' && saleCurrency === 'DOP') {
      return sum + (shippingCost * rate);
    }
    if (fromCurrency === 'DOP' && saleCurrency === 'USD') {
      return sum + (shippingCost / rate);
    }
    return sum + shippingCost;
  }, 0);
  const totalCostConverted = purchases.reduce((sum, p) => {
    const rate = Number(p.exchange_rate) || 1;
    const unitCost = Number(p.unit_cost) || 0;
    const qty = Number(p.quantity) || 0;
    const shippingCost = Number(p.shipping_cost) || 0;
    const fromCurrency = p.cost_currency || 'USD';
    const total = (unitCost * qty) + shippingCost;
    
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

  const avgCost = totalQuantity > 0 ? totalCostConverted / totalQuantity : 0;

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg">
        <Package className="w-10 h-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium">Sin historial de compras</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Agrega compras para ver el historial aquí
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Compras</p>
            <p className="text-lg font-bold">{purchases.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Unidades</p>
            <p className="text-lg font-bold">{totalQuantity}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Envíos</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totalShipping, saleCurrency)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Costo Prom.</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(avgCost, saleCurrency)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Envío</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPurchases.map((purchase) => {
                const rate = Number(purchase.exchange_rate) || 1;
                const unitCost = Number(purchase.unit_cost) || 0;
                const qty = Number(purchase.quantity) || 0;
                const shippingCost = Number(purchase.shipping_cost) || 0;
                const total = (unitCost * qty) + shippingCost;
                const fromCurrency = purchase.cost_currency || 'USD';
                
                let totalConverted = total;
                let shippingConverted = shippingCost;
                if (fromCurrency !== saleCurrency) {
                  if (fromCurrency === 'USD' && saleCurrency === 'DOP') {
                    totalConverted = total * rate;
                    shippingConverted = shippingCost * rate;
                  } else if (fromCurrency === 'DOP' && saleCurrency === 'USD') {
                    totalConverted = total / rate;
                    shippingConverted = shippingCost / rate;
                  }
                }

                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-sm">
                      {purchase.purchase_date
                        ? format(parseISO(purchase.purchase_date), 'dd MMM yy', { locale: es })
                        : format(parseISO(purchase.created_at), 'dd MMM yy', { locale: es })}
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

        {/* Total footer */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
          <span className="text-sm font-medium">Total Invertido</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(totalCostConverted, saleCurrency)}
          </span>
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
