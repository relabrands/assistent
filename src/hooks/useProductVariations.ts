import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoreProductVariation } from '@/types/store';

export function useProductVariations(profileId: string | undefined) {
  const { toast } = useToast();
  const [variations, setVariations] = useState<StoreProductVariation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVariations = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_product_variations')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVariations(data as StoreProductVariation[]);
    } catch (error: any) {
      console.error('Error fetching variations:', error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchVariations();
  }, [fetchVariations]);

  const getVariationsForProduct = useCallback(
    (productId: string) => variations.filter((v) => v.product_id === productId),
    [variations]
  );

  const createVariation = async (
    data: Omit<StoreProductVariation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!profileId) return null;

    try {
      const { data: newVariation, error } = await supabase
        .from('store_product_variations')
        .insert({ ...data, user_id: profileId })
        .select()
        .single();

      if (error) throw error;

      setVariations((prev) => [newVariation as StoreProductVariation, ...prev]);
      toast({ title: 'Variación creada', description: 'La variación se agregó correctamente' });
      return newVariation;
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
      const { error } = await supabase
        .from('store_product_variations')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setVariations((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...data } : v))
      );
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
      const { error } = await supabase
        .from('store_product_variations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVariations((prev) => prev.filter((v) => v.id !== id));
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
    refetch: fetchVariations,
    getVariationsForProduct,
    createVariation,
    updateVariation,
    deleteVariation,
  };
}
