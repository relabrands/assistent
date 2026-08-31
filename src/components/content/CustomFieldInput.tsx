import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CustomField } from '@/hooks/useCustomFields';

interface CustomFieldInputProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function CustomFieldInput({ field, value, onChange, disabled }: CustomFieldInputProps) {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.field_label}
            disabled={disabled}
            className="h-9"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.field_label}
            disabled={disabled}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.valueAsNumber || null)}
            placeholder={field.field_label}
            disabled={disabled}
            className="h-9"
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(checked)}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">
              {field.field_label}
            </span>
          </div>
        );

      case 'date':
        const dateValue = value ? new Date(value as string) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-9',
                  !value && 'text-muted-foreground'
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'PPP', { locale: es }) : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => onChange(date?.toISOString() || null)}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        );

      case 'select':
        const options = field.field_options?.options || [];
        return (
          <Select 
            value={(value as string) || 'none'} 
            onValueChange={(v) => onChange(v === 'none' ? null : v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin seleccionar</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const multiOptions = field.field_options?.options || [];
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <Select
              value="add"
              onValueChange={(v) => {
                if (v !== 'add' && !selectedValues.includes(v)) {
                  onChange([...selectedValues, v]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Agregar opción..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add" disabled>Agregar opción...</SelectItem>
                {multiOptions
                  .filter(o => !selectedValues.includes(o))
                  .map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1">
                    {v}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => onChange(selectedValues.filter(sv => sv !== v))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      {field.field_type !== 'checkbox' && (
        <Label className="text-sm">
          {field.field_label}
          {field.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderField()}
    </div>
  );
}
