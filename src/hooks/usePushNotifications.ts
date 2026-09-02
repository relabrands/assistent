import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, messaging } from '@/integrations/firebase/client';
import { getToken, onMessage } from 'firebase/messaging';
import { Profile, Task } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications(profile: Profile | null, tasks: Task[]) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('push_notifications_enabled');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    }
    return false;
  });

  const [isSupported, setIsSupported] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && !!messaging;
    setIsSupported(supported);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Sync state from Firestore if profile is available
  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    async function checkSubscription() {
      try {
        const subDoc = await getDoc(doc(db, 'push_subscriptions', profile.id));
        if (subDoc.exists() && isMounted) {
          const data = subDoc.data();
          const isEnabled = data.enabled !== false && !!data.fcmToken;
          setNotificationsEnabled(isEnabled);
          localStorage.setItem('push_notifications_enabled', String(isEnabled));
        }
      } catch (err) {
        console.error('Error fetching push subscription:', err);
      }
    }

    checkSubscription();
    return () => { isMounted = false; };
  }, [profile]);

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging || permission !== 'granted') return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground push notification received:', payload);
      
      const title = payload.notification?.title || 'Nueva Notificación';
      const body = payload.notification?.body || '';

      toast({
        title: title,
        description: body,
      });

      if (permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
          });
        } catch (e) {
          console.log('Error showing foreground notification:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [permission, toast]);

  const savePushSubscription = useCallback(async (forceProfile?: typeof profile): Promise<string | null> => {
    const activeProfile = forceProfile || profile;
    if (!activeProfile || !messaging) return null;

    try {
      // Register service worker explicitly for FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VITE_FIREBASE_VAPID_KEY is missing in env');
        return null;
      }

      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });

      if (currentToken) {
        await setDoc(doc(db, 'push_subscriptions', activeProfile.id), {
          user_id: activeProfile.id,
          fcmToken: currentToken,
          enabled: true,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        
        console.log('FCM Token saved to push_subscriptions successfully:', currentToken.substring(0, 20) + '...');
        return currentToken;
      } else {
        console.log('No FCM registration token available.');
        return null;
      }
    } catch (error) {
      console.error('Error saving FCM push subscription:', error);
      return null;
    }
  }, [profile]);

  const toggleNotifications = useCallback(async (targetState?: boolean) => {
    if (!profile) return false;
    const shouldEnable = targetState !== undefined ? targetState : !notificationsEnabled;
    setIsUpdating(true);

    try {
      if (shouldEnable) {
        // Request browser permission if not yet granted
        let currentPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
        if (currentPerm !== 'granted') {
          currentPerm = await Notification.requestPermission();
          setPermission(currentPerm);
        }

        if (currentPerm !== 'granted') {
          toast({
            title: 'Permiso no otorgado',
            description: 'Las notificaciones están bloqueadas en tu navegador. Actívalas en la barra de direcciones.',
            variant: 'destructive',
          });
          setNotificationsEnabled(false);
          localStorage.setItem('push_notifications_enabled', 'false');
          setIsUpdating(false);
          return false;
        }

        // Register and save token to Firestore
        const token = await savePushSubscription(profile);
        setNotificationsEnabled(true);
        localStorage.setItem('push_notifications_enabled', 'true');

        toast({
          title: 'Notificaciones activadas ✅',
          description: 'Recibirás alertas de tareas próximas a vencer.',
        });

        // Trigger welcome notification if possible
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 Notificaciones CRM Activadas', {
              body: '¡Listo! Te notificaremos en segundo plano cuando tus tareas estén por vencer.',
              icon: '/pwa-192x192.png',
            });
          } catch (e) {
            console.log('Direct Notification error:', e);
          }
        }

        setIsUpdating(false);
        return true;
      } else {
        // Disable notifications in Firestore & local state
        await setDoc(doc(db, 'push_subscriptions', profile.id), {
          user_id: profile.id,
          fcmToken: null,
          enabled: false,
          updated_at: new Date().toISOString(),
        }, { merge: true });

        setNotificationsEnabled(false);
        localStorage.setItem('push_notifications_enabled', 'false');

        toast({
          title: 'Notificaciones desactivadas',
          description: 'Ya no recibirás alertas automáticas de tareas.',
        });
        setIsUpdating(false);
        return false;
      }
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo cambiar el estado de las notificaciones.',
        variant: 'destructive',
      });
      setIsUpdating(false);
      return false;
    }
  }, [profile, notificationsEnabled, savePushSubscription, toast]);

  const sendTestNotification = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      toast({
        title: 'Permiso requerido',
        description: 'Debes activar las notificaciones primero.',
        variant: 'destructive',
      });
      return;
    }

    try {
      new Notification('🔔 Notificación de prueba - CRM', {
        body: '¡Excelente! Las notificaciones están funcionando perfectamente en este dispositivo.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
      toast({
        title: 'Prueba enviada ✅',
        description: 'Si no la ves en pantalla, revisa el Centro de Notificaciones de tu Mac o celular.',
      });
    } catch (err) {
      console.error('Error sending local test notification:', err);
      toast({
        title: 'Aviso',
        description: 'Tu navegador no permitió mostrar la notificación directa.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Backward compatibility
  const requestPermission = useCallback(() => toggleNotifications(true), [toggleNotifications]);
  const showNotification = useCallback((title: string) => {
    console.log('Local showNotification called for:', title);
  }, []);
  const checkUpcomingTasks = useCallback(() => {}, []);

  return {
    isSupported,
    permission,
    notificationsEnabled,
    isUpdating,
    toggleNotifications,
    requestPermission,
    sendTestNotification,
    showNotification,
    checkUpcomingTasks,
    savePushSubscription,
  };
}
