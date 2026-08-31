import { useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/integrations/firebase/client';
import { Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProfile(profile: Profile | null, onProfileUpdate?: (profile: Profile) => void) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!profile) return false;

    setLoading(true);
    try {
      const profileRef = doc(db, 'profiles', profile.id);
      await updateDoc(profileRef, {
        display_name: displayName,
        updated_at: new Date().toISOString(),
      });

      const updatedProfile = { ...profile, display_name: displayName, updated_at: new Date().toISOString() };
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: 'Nombre actualizado',
        description: 'Tu nombre de perfil ha sido actualizado',
      });
      return true;
    } catch (error) {
      console.error('Error updating display name in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el nombre',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile, toast, onProfileUpdate]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!profile) return null;

    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      toast({
        title: 'Error',
        description: 'No se pudo verificar la sesión',
        variant: 'destructive',
      });
      return null;
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `avatars/${user.uid}/avatar.${fileExt}`;
    const storageRef = ref(storage, filePath);

    try {
      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);

      const profileRef = doc(db, 'profiles', profile.id);
      await updateDoc(profileRef, {
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      const updatedProfile = { ...profile, avatar_url: publicUrl, updated_at: new Date().toISOString() };
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: 'Avatar actualizado',
        description: 'Tu foto de perfil ha sido actualizada',
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar to Firebase Storage:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [profile, toast, onProfileUpdate]);

  const removeAvatar = useCallback(async () => {
    if (!profile || !profile.avatar_url) return false;

    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return false;
    }

    try {
      const storageRef = ref(storage, `avatars/${user.uid}/avatar.png`);
      try {
        await deleteObject(storageRef);
      } catch (delErr) {
        console.warn('Avatar delete error (may not exist):', delErr);
      }

      const profileRef = doc(db, 'profiles', profile.id);
      await updateDoc(profileRef, {
        avatar_url: null,
        updated_at: new Date().toISOString(),
      });

      const updatedProfile = { ...profile, avatar_url: null, updated_at: new Date().toISOString() };
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: 'Avatar eliminado',
      });
      return true;
    } catch (error) {
      console.error('Error removing avatar in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el avatar',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile, toast, onProfileUpdate]);

  return {
    loading,
    updateDisplayName,
    uploadAvatar,
    removeAvatar,
  };
}
