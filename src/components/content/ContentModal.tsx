import { useState, useEffect, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';

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
import { 
  ContentItem, 
  ContentType, 
  ContentStatus,
  PlatformType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_COLORS,
  PLATFORM_LABELS,
} from '@/types/content';
import { Profile } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Trash2, 
  Upload, 
  CalendarIcon, 
  X, 
  CheckCircle, 
  XCircle,
  FileVideo,
  Link2,
  Hash,
  MessageSquare
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/integrations/firebase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCustomFields, useCustomFieldValues } from '@/hooks/useCustomFields';
import { CustomFieldInput } from '@/components/content/CustomFieldInput';

interface ContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: ContentItem | null;
  clientId: string;
  projectId: string;
  profiles: Profile[];
  profile: Profile;
  onSave: (data: {
    title: string;
    content_type: ContentType;
    platform: PlatformType;
    status?: ContentStatus;
    scheduled_date?: Date | null;
    copy?: string | null;
    hashtags?: string[] | null;
    cta?: string | null;
    link?: string | null;
    reference_urls?: string[] | null;
    file_urls?: string[] | null;
    assigned_to?: string | null;
  }) => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  isClientView?: boolean;
}

export function ContentModal({ 
  open, 
  onOpenChange, 
  content,
  clientId,
  projectId,
  profiles,
  profile,
  onSave,
  onDelete,
  onApprove,
  onRequestChanges,
  isClientView = false,
}: ContentModalProps) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('post');
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [copy, setCopy] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [cta, setCta] = useState('');
  const [link, setLink] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fields: customFields } = useCustomFields(projectId);
  const { values: savedCustomValues, saveValues: saveCustomValues } = useCustomFieldValues(content?.id || null);

  useEffect(() => {
    if (open) {
      setTitle(content?.title || '');
      setContentType(content?.content_type || 'post');
      setPlatform(content?.platform || 'instagram');
      setStatus(content?.status || 'draft');
      setScheduledDate(content?.scheduled_date ? new Date(content.scheduled_date) : null);
      setCopy(content?.copy || '');
      setHashtags(content?.hashtags?.join(', ') || '');
      setCta(content?.cta || '');
      setLink(content?.link || '');
      setReferenceUrls(content?.reference_urls?.join('\n') || '');
      setFileUrls(content?.file_urls || []);
      setAssignedTo(content?.assigned_to || '');
      setCustomFieldValues(savedCustomValues);
    }
  }, [open, content, savedCustomValues]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `content/${clientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, file);
        const publicUrl = await getDownloadURL(storageRef);

        newUrls.push(publicUrl);
      }

      setFileUrls(prev => [...prev, ...newUrls]);
      toast.success('Archivos subidos correctamente');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (urlToRemove: string) => {
    setFileUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const hashtagsArray = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    const refUrlsArray = referenceUrls.split('\n').map(u => u.trim()).filter(Boolean);

    onSave({
      title: title.trim(),
      content_type: contentType,
      platform,
      status,
      scheduled_date: scheduledDate,
      copy: copy.trim() || null,
      hashtags: hashtagsArray.length > 0 ? hashtagsArray : null,
      cta: cta.trim() || null,
      link: link.trim() || null,
      reference_urls: refUrlsArray.length > 0 ? refUrlsArray : null,
      file_urls: fileUrls.length > 0 ? fileUrls : null,
      assigned_to: assignedTo || null,
    });

    onOpenChange(false);
  };

  const canApprove = isClientView && content && (content.status === 'pending_review' || content.status === 'in_review');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl h-[90vh] sm:h-auto sm:max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 shrink-0 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                {CONTENT_TYPE_ICONS[contentType]} 
                {content ? (isClientView ? 'Detalle del contenido' : 'Editar contenido') : 'Nuevo contenido'}
              </span>
              {content && (
                <Badge className={cn(
                  CONTENT_STATUS_COLORS[content.status].bg,
                  CONTENT_STATUS_COLORS[content.status].text
                )}>
                  {CONTENT_STATUS_LABELS[content.status]}
                </Badge>
              )}
            </DialogTitle>
            {content?.link && (
              <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1.5 font-medium">
                <a href={content.link} target="_blank" rel="noopener noreferrer">
                  <span className="font-bold text-[11px] px-1 bg-black text-white dark:bg-white dark:text-black rounded">N</span>
                  Abrir en Notion
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del contenido"
                required
                disabled={isClientView}
              />
            </div>

            {/* Type, Platform, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)} disabled={isClientView}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {CONTENT_TYPE_ICONS[value as ContentType]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformType)} disabled={isClientView}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isClientView && (
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Date and Assignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha de publicación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !scheduledDate && 'text-muted-foreground'
                      )}
                      disabled={isClientView}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate || undefined}
                      onSelect={(date) => setScheduledDate(date || null)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!isClientView && (
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select value={assignedTo || "unassigned"} onValueChange={(v) => setAssignedTo(v === "unassigned" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Copy */}
            <div className="space-y-2">
              <Label htmlFor="copy" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> Copy
              </Label>
              <Textarea
                id="copy"
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Texto de la publicación..."
                rows={4}
                disabled={isClientView}
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label htmlFor="hashtags" className="flex items-center gap-1">
                <Hash className="w-4 h-4" /> Hashtags
              </Label>
              <Input
                id="hashtags"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#marketing, #socialmedia, #branding"
                disabled={isClientView}
              />
              <p className="text-xs text-muted-foreground">Separados por coma</p>
            </div>

            {/* CTA and Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cta">CTA (Call to Action)</Label>
                <Input
                  id="cta"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Ej: ¡Descubre más!"
                  disabled={isClientView}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link" className="flex items-center gap-1">
                  <Link2 className="w-4 h-4" /> Link
                </Label>
                <Input
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  disabled={isClientView}
                />
              </div>
            </div>

            {/* Reference URLs */}
            <div className="space-y-2">
              <Label htmlFor="referenceUrls">Referencias visuales (URLs)</Label>
              <Textarea
                id="referenceUrls"
                value={referenceUrls}
                onChange={(e) => setReferenceUrls(e.target.value)}
                placeholder="Una URL por línea"
                rows={2}
                disabled={isClientView}
              />
            </div>

            {/* File Uploads */}
            <div className="space-y-2">
              <Label>Archivos adjuntos</Label>
              <div className="flex flex-wrap gap-2">
                {fileUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={url} 
                        alt={`Archivo ${idx + 1}`} 
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center">
                        <FileVideo className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {!isClientView && (
                      <button
                        type="button"
                        onClick={() => removeFile(url)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!isClientView && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs">Subir</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm">Campos adicionales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields.map((field) => (
                    <CustomFieldInput
                      key={field.id}
                      field={field}
                      value={customFieldValues[field.id]}
                      onChange={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                      disabled={isClientView}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Approval Buttons for Client */}
            {canApprove && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border bg-muted/30">
                <Button
                  type="button"
                  onClick={onApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar contenido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRequestChanges}
                  className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Solicitar cambios
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {!isClientView && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <div className="flex gap-2 sm:gap-3 w-full">
                  {content && onDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={onDelete}
                      className="shrink-0"
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
                </div>
                <Button type="submit" className="w-full sm:flex-1" disabled={uploading}>
                  {content ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            )}

            {isClientView && !canApprove && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
