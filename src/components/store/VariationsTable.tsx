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
import { Edit, Trash2, Palette, Ruler } from 'lucide-react';
import { StoreProductVariation } from '@/types/store';
import { useState } from 'react';

interface VariationsTableProps {
  variations: StoreProductVariation[];
  onEdit: (variation: StoreProductVariation) => void;
  onDelete: (id: string) => void;
}

export function VariationsTable({
  variations,
  onEdit,
  onDelete,
}: VariationsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (variations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay variaciones registradas</p>
        <p className="text-xs mt-1">Agrega colores o tallas para este producto</p>
      </div>
    );
  }

  const totalStock = variations.reduce((sum, v) => sum + v.stock, 0);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {variations.length} variación{variations.length !== 1 ? 'es' : ''}
          </span>
          <span className="font-medium">Stock total: {totalStock}</span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((variation) => (
                <TableRow key={variation.id}>
                  <TableCell>
                    {variation.color ? (
                      <div className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{variation.color}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {variation.size ? (
                      <div className="flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{variation.size}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={variation.stock > 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {variation.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(variation)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(variation.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar variación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El stock de esta variación se perderá.
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
