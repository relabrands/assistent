import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { StoreProductVariation } from '@/types/store';

export function useProductVariations(profileId: string | undefined) {
  const { toast } = useToast();
  const [variations, setVariations] = useState<StoreProductVariation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setVariations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'store_product_variations'),
      where('user_id', '==', profileId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreProductVariation));
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setVariations(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching variations in Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileId]);

  const getVariationsForProduct = useCallback(
    (productId: string) => variations.filter((v) => v.product_id === productId),
    [variations]
  );

  const createVariation = async (
    data: Omit<StoreProductVariation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!profileId) return null;

    try {
      const newVar = {
        ...data,
        user_id: profileId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'store_product_variations'), newVar);
      toast({ title: 'Variación creada', description: 'La variación se agregó correctamente' });
      return { id: docRef.id, ...newVar } as StoreProductVariation;
    } catch (error: any) {
      console.error('Error creating variation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la variación',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateVariation = async (id: string, data: Partial<StoreProductVariation>) => {
    try {
      await updateDoc(doc(db, 'store_product_variations', id), {
        ...data,
        updated_at: new Date().toISOString(),
      });
      toast({ title: 'Variación actualizada' });
    } catch (error: any) {
      console.error('Error updating variation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la variación',
        variant: 'destructive',
      });
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'store_product_variations', id));
      toast({ title: 'Variación eliminada' });
    } catch (error: any) {
      console.error('Error deleting variation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la variación',
        variant: 'destructive',
      });
    }
  };

  return {
    variations,
    loading,
    refetch: () => {},
    getVariationsForProduct,
    createVariation,
    updateVariation,
    deleteVariation,
  };
}
