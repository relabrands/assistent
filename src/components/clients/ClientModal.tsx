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

import { Client } from '@/types/content';
import { Trash2, Upload, Globe, Instagram, Linkedin, Youtube } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/integrations/firebase/client';
import { toast } from 'sonner';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  projectId: string;
  onSave: (data: {
    project_id: string;
    name: string;
    brand_name?: string | null;
    logo_url?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    website?: string | null;
    social_instagram?: string | null;
    social_facebook?: string | null;
    social_tiktok?: string | null;
    social_linkedin?: string | null;
    social_youtube?: string | null;
    notes?: string | null;
    services?: string[];
  }) => void;
  onDelete?: (id: string) => void;
}

export function ClientModal({ 
  open, 
  onOpenChange, 
  client,
  projectId,
  onSave,
  onDelete,
}: ClientModalProps) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [notes, setNotes] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(client?.name || '');
      setBrandName(client?.brand_name || '');
      setLogoUrl(client?.logo_url || '');
      setContactName(client?.contact_name || '');
      setContactEmail(client?.contact_email || '');
      setContactPhone(client?.contact_phone || '');
      setWebsite(client?.website || '');
      setSocialInstagram(client?.social_instagram || '');
      setSocialFacebook(client?.social_facebook || '');
      setSocialTiktok(client?.social_tiktok || '');
      setSocialLinkedin(client?.social_linkedin || '');
      setSocialYoutube(client?.social_youtube || '');
      setNotes(client?.notes || '');
      setServicesInput(client?.services?.join(', ') || '');
    }
  }, [open, client]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `logos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);

      setLogoUrl(publicUrl);
      toast.success('Logo subido correctamente');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      project_id: projectId,
      name: name.trim(),
      brand_name: brandName.trim() || null,
      logo_url: logoUrl.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      website: website.trim() || null,
      social_instagram: socialInstagram.trim() || null,
      social_facebook: socialFacebook.trim() || null,
      social_tiktok: socialTiktok.trim() || null,
      social_linkedin: socialLinkedin.trim() || null,
      social_youtube: socialYoutube.trim() || null,
      notes: notes.trim() || null,
      services: servicesInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (client && onDelete) {
      onDelete(client.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 shrink-0 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {client ? 'Editar cliente' : 'Nuevo cliente'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-4">
            {/* Logo Upload */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="logo" className="text-sm">Logo del cliente</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="w-full text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del cliente"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brandName">Nombre de marca</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Marca comercial"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Información de contacto</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contactName" className="text-xs">Nombre</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Persona de contacto"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-xs">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-xs">Teléfono</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+52 123 456 7890"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Sitio web
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.cliente.com"
              />
            </div>

            {/* Social Media */}
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Redes sociales</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="socialInstagram" className="text-xs flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram
                  </Label>
                  <Input
                    id="socialInstagram"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="@usuario"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialFacebook" className="text-xs">Facebook</Label>
                  <Input
                    id="socialFacebook"
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    placeholder="facebook.com/pagina"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialTiktok" className="text-xs">TikTok</Label>
                  <Input
                    id="socialTiktok"
                    value={socialTiktok}
                    onChange={(e) => setSocialTiktok(e.target.value)}
                    placeholder="@usuario"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialLinkedin" className="text-xs flex items-center gap-1">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </Label>
                  <Input
                    id="socialLinkedin"
                    value={socialLinkedin}
                    onChange={(e) => setSocialLinkedin(e.target.value)}
                    placeholder="linkedin.com/company/..."
                    className="h-9"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="socialYoutube" className="text-xs flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> YouTube
                  </Label>
                  <Input
                    id="socialYoutube"
                    value={socialYoutube}
                    onChange={(e) => setSocialYoutube(e.target.value)}
                    placeholder="youtube.com/@canal"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <Label htmlFor="services">Servicios contratados</Label>
              <Input
                id="services"
                value={servicesInput}
                onChange={(e) => setServicesInput(e.target.value)}
                placeholder="Ej: Desarrollo Web, SEO, Branding (separados por comas)"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional del cliente..."
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <div className="flex gap-2 sm:gap-3 w-full">
                {client && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleDelete}
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
                {client ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
