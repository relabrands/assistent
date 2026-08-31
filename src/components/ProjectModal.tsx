import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Project, SectorType, SECTOR_LABELS } from '@/types/database';
import { Trash2, Palette } from 'lucide-react';

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSave: (data: {
    name: string;
    description: string | null;
    sector: SectorType;
    color: string;
    uses_clients?: boolean;
    uses_content_calendar?: boolean;
    allows_client_access?: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#000000', '#64748b', '#78716c', '#0f172a',
];

export function ProjectModal({ 
  open, 
  onOpenChange, 
  project,
  onSave,
  onDelete,
  isAdmin = false,
}: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState<SectorType>('other');
  const [color, setColor] = useState(COLORS[0]);
  const [usesClients, setUsesClients] = useState(false);
  const [usesContentCalendar, setUsesContentCalendar] = useState(false);
  const [allowsClientAccess, setAllowsClientAccess] = useState(false);

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (open) {
      setName(project?.name || '');
      setDescription(project?.description || '');
      setSector(project?.sector || 'other');
      setColor(project?.color || COLORS[0]);
      setUsesClients(project?.uses_clients || false);
      setUsesContentCalendar((project as any)?.uses_content_calendar || false);
      setAllowsClientAccess((project as any)?.allows_client_access || false);
    }
  }, [open, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      sector,
      color,
      uses_clients: usesClients,
      uses_content_calendar: usesContentCalendar,
      allows_client_access: allowsClientAccess,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (project && onDelete) {
      onDelete(project.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {project ? 'Editar proyecto' : 'Nuevo proyecto'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del proyecto</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi Startup"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este proyecto?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Sector</Label>
            <Select value={sector} onValueChange={(v) => setSector(v as SectorType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SECTOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform border border-border ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full">
                    <Palette className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs">Código de color (HEX)</Label>
                    <div className="flex gap-2 items-center">
                      <div 
                        className="w-8 h-8 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <Input
                        value={color}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                            setColor(val);
                          }
                        }}
                        placeholder="#000000"
                        className="w-24 h-8 text-sm font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="uses-clients" className="text-sm font-medium cursor-pointer">
                    Usa clientes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gestiona clientes/marcas dentro del proyecto
                  </p>
                </div>
                <Switch
                  id="uses-clients"
                  checked={usesClients}
                  onCheckedChange={setUsesClients}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="uses-calendar" className="text-sm font-medium cursor-pointer">
                    Calendario de contenido
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Planifica publicaciones en calendario mensual
                  </p>
                </div>
                <Switch
                  id="uses-calendar"
                  checked={usesContentCalendar}
                  onCheckedChange={setUsesContentCalendar}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="allows-client-access" className="text-sm font-medium cursor-pointer">
                    Acceso para clientes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que clientes externos vean y aprueben contenido
                  </p>
                </div>
                <Switch
                  id="allows-client-access"
                  checked={allowsClientAccess}
                  onCheckedChange={setAllowsClientAccess}
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            {project && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {project ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
