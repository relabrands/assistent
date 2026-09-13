import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import {
  Subscription,
  SubscriptionStatus,
  getMonthlyEquivalentCost,
  getDaysUntilRenewal,
} from '@/types/subscription';
import { Profile, Workspace } from '@/types/database';
import { toast } from 'sonner';

export function useSubscriptions(
  profile: Profile | null,
  currentWorkspace: Workspace | null = null
) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const subsQuery = query(collection(db, 'subscriptions'));

    const unsubscribe = onSnapshot(
      subsQuery,
      (snapshot) => {
        let items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));

        // Workspace filtering: allow workspace match or null/global
        if (currentWorkspace?.id) {
          items = items.filter(
            (s) => !s.workspace_id || s.workspace_id === currentWorkspace.id
          );
        }

        // Sort: active and trial first, then by days until renewal
        items.sort((a, b) => {
          const statusOrder: Record<SubscriptionStatus, number> = {
            active: 1,
            trial: 2,
            paused: 3,
            cancelled: 4,
          };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          const daysA = getDaysUntilRenewal(a) ?? 999;
          const daysB = getDaysUntilRenewal(b) ?? 999;
          if (daysA !== daysB) return daysA - daysB;
          return a.name.localeCompare(b.name);
        });

        setSubscriptions(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subscriptions from Firestore:', error);
        toast.error('Error al cargar suscripciones');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile, currentWorkspace]);

  // Derived Financial Metrics & Analytics
  const metrics = useMemo(() => {
    let totalMonthlyUSD = 0;
    let totalMonthlyDOP = 0;
    let totalMonthlyEUR = 0;
    let activeCount = 0;
    let pausedCount = 0;
    let trialCount = 0;
    let cancelledCount = 0;
    let upcomingWithin7Days = 0;

    const projectTotals: Record<string, { name?: string; monthlyUSD: number; monthlyDOP: number; count: number }> = {};
    const ownerTotals: Record<string, { name: string; monthlyUSD: number; monthlyDOP: number; count: number }> = {};
    const categoryTotals: Record<string, { monthlyUSD: number; monthlyDOP: number; count: number }> = {};

    subscriptions.forEach((sub) => {
      if (sub.status === 'active' || sub.status === 'trial') {
        const monthly = getMonthlyEquivalentCost(sub);
        if (sub.currency === 'USD') totalMonthlyUSD += monthly;
        else if (sub.currency === 'DOP') totalMonthlyDOP += monthly;
        else if (sub.currency === 'EUR') totalMonthlyEUR += monthly;

        // Project breakdown
        const projKey = sub.project_id || '__general__';
        if (!projectTotals[projKey]) {
          projectTotals[projKey] = { monthlyUSD: 0, monthlyDOP: 0, count: 0 };
        }
        if (sub.currency === 'USD') projectTotals[projKey].monthlyUSD += monthly;
        else if (sub.currency === 'DOP') projectTotals[projKey].monthlyDOP += monthly;
        projectTotals[projKey].count++;

        // Owner breakdown
        const ownerKey = sub.owner_name || sub.owner_id || 'Sin asignar';
        if (!ownerTotals[ownerKey]) {
          ownerTotals[ownerKey] = { name: ownerKey, monthlyUSD: 0, monthlyDOP: 0, count: 0 };
        }
        if (sub.currency === 'USD') ownerTotals[ownerKey].monthlyUSD += monthly;
        else if (sub.currency === 'DOP') ownerTotals[ownerKey].monthlyDOP += monthly;
        ownerTotals[ownerKey].count++;

        // Category breakdown
        const catKey = sub.category || 'other';
        if (!categoryTotals[catKey]) {
          categoryTotals[catKey] = { monthlyUSD: 0, monthlyDOP: 0, count: 0 };
        }
        if (sub.currency === 'USD') categoryTotals[catKey].monthlyUSD += monthly;
        else if (sub.currency === 'DOP') categoryTotals[catKey].monthlyDOP += monthly;
        categoryTotals[catKey].count++;

        // Days until renewal
        const days = getDaysUntilRenewal(sub);
        if (days !== null && days >= 0 && days <= 7) {
          upcomingWithin7Days++;
        }
      }

      if (sub.status === 'active') activeCount++;
      else if (sub.status === 'trial') trialCount++;
      else if (sub.status === 'paused') pausedCount++;
      else if (sub.status === 'cancelled') cancelledCount++;
    });

    return {
      totalMonthlyUSD,
      totalMonthlyDOP,
      totalMonthlyEUR,
      totalYearlyUSD: totalMonthlyUSD * 12,
      totalYearlyDOP: totalMonthlyDOP * 12,
      activeCount,
      pausedCount,
      trialCount,
      cancelledCount,
      totalCount: subscriptions.length,
      upcomingWithin7Days,
      projectTotals,
      ownerTotals,
      categoryTotals,
    };
  }, [subscriptions]);

  const addSubscription = useCallback(
    async (
      subData: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'created_by'>
    ) => {
      if (!profile) return null;

      try {
        const newSub = {
          ...subData,
          workspace_id: subData.workspace_id || currentWorkspace?.id || null,
          created_by: profile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'subscriptions'), newSub);
        toast.success(`Suscripción "${subData.name}" agregada con éxito`);
        return { id: docRef.id, ...newSub } as Subscription;
      } catch (error) {
        console.error('Error adding subscription to Firestore:', error);
        toast.error('No se pudo guardar la suscripción');
        return null;
      }
    },
    [profile, currentWorkspace]
  );

  const updateSubscription = useCallback(
    async (id: string, subData: Partial<Omit<Subscription, 'id' | 'created_at' | 'created_by'>>) => {
      try {
        await updateDoc(doc(db, 'subscriptions', id), {
          ...subData,
          updated_at: new Date().toISOString(),
        });
        toast.success('Suscripción actualizada');
        return true;
      } catch (error) {
        console.error('Error updating subscription in Firestore:', error);
        toast.error('Error al actualizar la suscripción');
        return false;
      }
    },
    []
  );

  const deleteSubscription = useCallback(async (id: string, name?: string) => {
    try {
      await deleteDoc(doc(db, 'subscriptions', id));
      toast.success(`Suscripción ${name ? `"${name}" ` : ''}eliminada`);
      return true;
    } catch (error) {
      console.error('Error deleting subscription in Firestore:', error);
      toast.error('Error al eliminar la suscripción');
      return false;
    }
  }, []);

  const toggleSubscriptionStatus = useCallback(
    async (sub: Subscription) => {
      const nextStatus: SubscriptionStatus = sub.status === 'active' ? 'paused' : 'active';
      const success = await updateSubscription(sub.id, { status: nextStatus });
      if (success) {
        toast.info(
          nextStatus === 'active'
            ? `Suscripción "${sub.name}" reactivada`
            : `Suscripción "${sub.name}" pausada`
        );
      }
      return success;
    },
    [updateSubscription]
  );

  return {
    subscriptions,
    metrics,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscriptionStatus,
  };
}
