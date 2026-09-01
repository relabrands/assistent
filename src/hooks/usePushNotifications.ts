import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, messaging } from '@/integrations/firebase/client';
import { getToken, onMessage } from 'firebase/messaging';
import { Profile, Task } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications(profile: Profile | null, tasks: Task[]) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && !!messaging);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

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

      // Optionally show a native notification even if foreground
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
      }
    });

    return () => unsubscribe();
  }, [permission, toast]);

  const requestPermission = useCallback(async () => {
    if (!isSupported || !messaging) {
      toast({
        title: 'No soportado',
        description: 'Las notificaciones push no están soportadas en este navegador o entorno.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast({
          title: 'Notificaciones activadas',
          description: 'Recibirás alertas en segundo plano cuando tus tareas estén por vencer.',
        });
        // Auto-save subscription when granted
        savePushSubscription();
        return true;
      } else {
        toast({
          title: 'Notificaciones bloqueadas',
          description: 'Puedes activarlas desde la configuración de tu navegador',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  const savePushSubscription = useCallback(async () => {
    if (!profile || !isSupported || permission !== 'granted' || !messaging) return;

    try {
      // Register service worker explicitly for FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VITE_FIREBASE_VAPID_KEY is missing in env');
        return;
      }

      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });

      if (currentToken) {
        // Save FCM token to Firestore instead of raw push endpoints
        await setDoc(doc(db, 'push_subscriptions', profile.id), {
          user_id: profile.id,
          fcmToken: currentToken,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        
        console.log('FCM Token saved to push_subscriptions successfully');
      } else {
        console.log('No FCM registration token available.');
      }
    } catch (error) {
      console.error('Error saving FCM push subscription:', error);
    }
  }, [profile, isSupported, permission]);

  // Keep these dummy functions to prevent breaking components that use them
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    console.log('Local showNotification called, relying on FCM instead for:', title);
  }, []);
  const checkUpcomingTasks = useCallback(() => {}, []);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    checkUpcomingTasks,
    savePushSubscription,
  };
}
