import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StorePurchase, CURRENCY_LABELS, CurrencyCode } from '@/types/store';

const formSchema = z.object({
  quantity: z.coerce.number().min(1, 'Mínimo 1 unidad'),
  unit_cost: z.coerce.number().min(0, 'El costo debe ser positivo'),
  shipping_cost: z.coerce.number().min(0, 'El envío debe ser positivo'),
  cost_currency: z.enum(['USD', 'DOP']),
  exchange_rate: z.coerce.number().min(0).optional(),
  provider: z.string().optional(),
  purchase_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: StorePurchase | null;
  onUpdate: (id: string, data: Partial<StorePurchase>) => Promise<void>;
}

export function EditPurchaseModal({
  open,
  onOpenChange,
  purchase,
  onUpdate,
}: EditPurchaseModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      unit_cost: 0,
      shipping_cost: 0,
      cost_currency: 'USD',
      exchange_rate: 1,
      provider: '',
      purchase_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (purchase) {
      form.reset({
        quantity: purchase.quantity || 1,
        unit_cost: Number(purchase.unit_cost) || 0,
        shipping_cost: Number(purchase.shipping_cost) || 0,
        cost_currency: (purchase.cost_currency || 'USD') as CurrencyCode,
        exchange_rate: Number(purchase.exchange_rate) || 1,
        provider: purchase.provider || '',
        purchase_date: purchase.purchase_date || '',
        notes: purchase.notes || '',
      });
    }
  }, [purchase, form]);

  const onSubmit = async (values: FormValues) => {
    if (!purchase) return;

    await onUpdate(purchase.id, {
      quantity: values.quantity,
      unit_cost: values.unit_cost,
      shipping_cost: values.shipping_cost,
      cost_currency: values.cost_currency as CurrencyCode,
      exchange_rate: values.exchange_rate || null,
      provider: values.provider || null,
      purchase_date: values.purchase_date || null,
      notes: values.notes || null,
    });

    onOpenChange(false);
  };

  const watchCurrency = form.watch('cost_currency');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Compra</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Unitario</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shipping_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo de Envío</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="cost_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchCurrency === 'USD' && (
                <FormField
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tasa de Cambio</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="ej: 58.50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Compra</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
