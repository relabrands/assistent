import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Settings, GripVertical } from 'lucide-react';
import { CustomField, FieldType, useCustomFields } from '@/hooks/useCustomFields';

interface CustomFieldsManagerProps {
  projectId: string;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  select: 'Selección única',
  multiselect: 'Selección múltiple',
  date: 'Fecha',
  checkbox: 'Casilla de verificación',
  number: 'Número',
};

export function CustomFieldsManager({ projectId }: CustomFieldsManagerProps) {
  const { fields, addField, updateField, deleteField } = useCustomFields(projectId);
  const [isOpen, setIsOpen] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text' as FieldType,
    is_required: false,
    options: '',
  });

  const handleAddField = async () => {
    if (!newField.field_label.trim()) return;

    const fieldName = newField.field_label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    const fieldOptions = ['select', 'multiselect'].includes(newField.field_type)
      ? { options: newField.options.split(',').map(o => o.trim()).filter(Boolean) }
      : null;

    await addField({
      field_name: fieldName,
      field_label: newField.field_label,
      field_type: newField.field_type,
      field_options: fieldOptions,
      is_required: newField.is_required,
    });

    setNewField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      options: '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Campos personalizados</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar campos personalizados</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Fields */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Campos existentes</Label>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay campos personalizados
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <FieldItem 
                    key={field.id} 
                    field={field} 
                    onUpdate={updateField}
                    onDelete={deleteField}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add New Field */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Agregar nuevo campo</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre del campo</Label>
                <Input
                  value={newField.field_label}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_label: e.target.value }))}
                  placeholder="Ej: Notas de diseño"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select 
                  value={newField.field_type} 
                  onValueChange={(v) => setNewField(prev => ({ ...prev, field_type: v as FieldType }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {['select', 'multiselect'].includes(newField.field_type) && (
              <div className="space-y-1">
                <Label className="text-xs">Opciones (separadas por coma)</Label>
                <Input
                  value={newField.options}
                  onChange={(e) => setNewField(prev => ({ ...prev, options: e.target.value }))}
                  placeholder="Opción 1, Opción 2, Opción 3"
                  className="h-9"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newField.is_required}
                  onCheckedChange={(checked) => setNewField(prev => ({ ...prev, is_required: checked }))}
                />
                <Label className="text-xs">Campo obligatorio</Label>
              </div>
              
              <Button 
                onClick={handleAddField} 
                size="sm"
                disabled={!newField.field_label.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldItem({ 
  field, 
  onUpdate, 
  onDelete 
}: { 
  field: CustomField;
  onUpdate: (id: string, updates: Partial<CustomField>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{field.field_label}</p>
        <p className="text-xs text-muted-foreground">
          {FIELD_TYPE_LABELS[field.field_type as FieldType]}
          {field.is_required && ' • Obligatorio'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
        onClick={() => onDelete(field.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
