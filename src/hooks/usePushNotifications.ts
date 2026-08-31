import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Profile, Task } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours, differenceInDays, parseISO, isAfter, startOfDay } from 'date-fns';

export function usePushNotifications(profile: Profile | null, tasks: Task[]) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'No soportado',
        description: 'Las notificaciones push no están soportadas en este navegador',
        variant: 'destructive',
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast({
        title: 'Notificaciones activadas',
        description: 'Recibirás alertas de tareas próximas a vencer',
      });
      return true;
    } else {
      toast({
        title: 'Notificaciones bloqueadas',
        description: 'Puedes activarlas desde la configuración de tu navegador',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, toast]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
    }
  }, [permission]);

  const checkUpcomingTasks = useCallback(() => {
    if (permission !== 'granted' || !profile) return;

    const now = new Date();
    const notifiedTaskIds = JSON.parse(localStorage.getItem('notifiedTasks') || '{}');

    tasks.forEach((task) => {
      if (!task.due_date || task.status === 'completed') return;

      const dueDate = parseISO(task.due_date);
      const hoursUntilDue = differenceInHours(dueDate, now);
      const daysUntilDue = differenceInDays(dueDate, now);

      const lastNotified = notifiedTaskIds[task.id];
      if (lastNotified && lastNotified === startOfDay(now).toISOString()) return;

      let shouldNotify = false;
      let message = '';

      if (hoursUntilDue > 0 && hoursUntilDue <= 24) {
        shouldNotify = true;
        if (hoursUntilDue <= 2) {
          message = `Vence en ${Math.round(hoursUntilDue * 60)} minutos`;
        } else {
          message = `Vence hoy - ${Math.round(hoursUntilDue)} horas restantes`;
        }
      } else if (daysUntilDue === 1) {
        shouldNotify = true;
        message = 'Vence mañana';
      } else if (hoursUntilDue < 0 && isAfter(now, dueDate)) {
        shouldNotify = true;
        message = '⚠️ Tarea vencida';
      }

      if (shouldNotify) {
        showNotification(`📋 ${task.title}`, {
          body: message,
          tag: task.id,
          data: { taskId: task.id },
        });

        notifiedTaskIds[task.id] = startOfDay(now).toISOString();
        localStorage.setItem('notifiedTasks', JSON.stringify(notifiedTaskIds));
      }
    });
  }, [tasks, profile, permission, showNotification]);

  useEffect(() => {
    if (permission !== 'granted' || !profile) return;

    checkUpcomingTasks();
    const interval = setInterval(checkUpcomingTasks, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkUpcomingTasks, permission, profile]);

  const savePushSubscription = useCallback(async () => {
    if (!profile || !isSupported || permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const keys = subscription.toJSON().keys;
        if (keys) {
          await setDoc(doc(db, 'push_subscriptions', profile.id), {
            user_id: profile.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh || '',
            auth: keys.auth || '',
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  }, [profile, isSupported, permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    checkUpcomingTasks,
    savePushSubscription,
  };
}
