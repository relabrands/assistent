import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { StoreProductVariation } from '@/types/store';

interface VariationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  variation?: StoreProductVariation | null;
  onCreate: (data: Omit<StoreProductVariation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate: (id: string, data: Partial<StoreProductVariation>) => Promise<void>;
}

export function VariationModal({
  open,
  onOpenChange,
  productId,
  variation,
  onCreate,
  onUpdate,
}: VariationModalProps) {
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('0');
  const [notes, setNotes] = useState('');

  const isEditing = !!variation;

  useEffect(() => {
    if (!open) return;
    if (variation) {
      setColor(variation.color || '');
      setSize(variation.size || '');
      setSku(variation.sku || '');
      setStock(String(variation.stock || 0));
      setNotes(variation.notes || '');
    } else {
      setColor('');
      setSize('');
      setSku('');
      setStock('0');
      setNotes('');
    }
  }, [open, variation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!color.trim() && !size.trim()) return;

    setSaving(true);
    try {
      const data = {
        product_id: productId,
        color: color.trim() || null,
        size: size.trim() || null,
        sku: sku.trim() || null,
        stock: Math.max(0, parseInt(stock) || 0),
        notes: notes.trim() || null,
      };

      if (isEditing && variation) {
        await onUpdate(variation.id, data);
      } else {
        await onCreate(data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar variación' : 'Nueva variación'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ej: Rojo, Azul"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Talla/Tamaño</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Ej: S, M, L, XL"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código único"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Ingresa al menos un color o talla para crear la variación.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={saving || (!color.trim() && !size.trim())}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
