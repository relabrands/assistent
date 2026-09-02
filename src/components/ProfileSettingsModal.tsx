import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Profile } from '@/types/database';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import { Camera, Loader2, Trash2, Bell, BellOff, User, Save, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  tasks: any[];
  onProfileUpdate: (profile: Profile) => void;
}

export function ProfileSettingsModal({
  open,
  onOpenChange,
  profile,
  tasks,
  onProfileUpdate,
}: ProfileSettingsModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { loading, updateDisplayName, uploadAvatar, removeAvatar } = useProfile(profile, onProfileUpdate);
  const { 
    isSupported, 
    permission, 
    notificationsEnabled, 
    isUpdating, 
    toggleNotifications, 
    sendTestNotification 
  } = usePushNotifications(profile, tasks);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setDisplayName(profile.display_name);
  }, [profile.display_name]);

  const handleSaveName = async () => {
    if (displayName.trim() && displayName !== profile.display_name) {
      const success = await updateDisplayName(displayName.trim());
      if (success) {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    await uploadAvatar(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Mi Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile.display_name)}
                </AvatarFallback>
              </Avatar>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {profile.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAvatar}
                disabled={loading}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar foto
              </Button>
            )}
          </div>

          {/* Name Section */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={loading}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setDisplayName(profile.display_name);
                      setIsEditing(false);
                    }
                  }}
                />
                <Button onClick={handleSaveName} disabled={loading} size="icon">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <span>{profile.display_name}</span>
                <span className="text-xs text-muted-foreground">Clic para editar</span>
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="p-3 rounded-lg border bg-muted/30 text-muted-foreground">
              {profile.email || 'Sin email'}
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-2">
            <Label>Apariencia</Label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cambia la apariencia de la aplicación
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>

          {/* Notifications Section */}
          {isSupported && (
            <div className="space-y-2">
              <Label>Notificaciones</Label>
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <Bell className="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alertas de tareas próximas a vencer
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={(checked) => toggleNotifications(checked)}
                    disabled={isUpdating}
                  />
                </div>

                {notificationsEnabled && (
                  <div className="pt-2 border-t border-border/50 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={sendTestNotification}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5 text-primary" />
                      Enviar notificación de prueba
                    </Button>
                  </div>
                )}
              </div>
              {permission === 'denied' && (
                <p className="text-xs text-destructive">
                  Las notificaciones están bloqueadas en tu navegador. Haz clic en el ícono de candado o configuración junto a la URL para permitirlas.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
