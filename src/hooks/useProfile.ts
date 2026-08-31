import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProfile(profile: Profile | null, onProfileUpdate?: (profile: Profile) => void) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!profile) return false;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id)
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error updating display name:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el nombre',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Nombre actualizado',
      description: 'Tu nombre de perfil ha sido actualizado',
    });

    if (onProfileUpdate && data) {
      onProfileUpdate(data as Profile);
    }

    return true;
  }, [profile, toast, onProfileUpdate]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!profile) return null;

    setLoading(true);

    // Get the user's auth id for the folder path
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast({
        title: 'Error',
        description: 'No se pudo verificar la sesión',
        variant: 'destructive',
      });
      return null;
    }

    // Create file path: user_auth_id/avatar.ext
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Delete existing avatar first if exists
    if (profile.avatar_url) {
      const oldPath = profile.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      setLoading(false);
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive',
      });
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile with avatar URL
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)
      .select()
      .single();

    setLoading(false);

    if (updateError) {
      console.error('Error updating avatar URL:', updateError);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la URL del avatar',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Avatar actualizado',
      description: 'Tu foto de perfil ha sido actualizada',
    });

    if (onProfileUpdate && data) {
      onProfileUpdate(data as Profile);
    }

    return publicUrl;
  }, [profile, toast, onProfileUpdate]);

  const removeAvatar = useCallback(async () => {
    if (!profile || !profile.avatar_url) return false;

    setLoading(true);

    // Get the user's auth id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return false;
    }

    // Delete from storage
    const filePath = profile.avatar_url.split('/avatars/')[1];
    if (filePath) {
      await supabase.storage.from('avatars').remove([filePath]);
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', profile.id)
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el avatar',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Avatar eliminado',
    });

    if (onProfileUpdate && data) {
      onProfileUpdate(data as Profile);
    }

    return true;
  }, [profile, toast, onProfileUpdate]);

  return {
    loading,
    updateDisplayName,
    uploadAvatar,
    removeAvatar,
  };
}
