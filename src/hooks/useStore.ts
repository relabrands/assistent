import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  StoreProduct,
  StoreShippingCost,
  StoreSale,
  StorePurchase,
  ProductWithDetails,
  FinancialSummary,
  ProductCategory,
  ProductStatus,
  ShippingStatus,
  SaleStatus,
  PaymentMethod,
} from '@/types/store';

export function useStore(profileId: string | undefined) {
  const { toast } = useToast();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [shippingCosts, setShippingCosts] = useState<StoreShippingCost[]>([]);
  const [sales, setSales] = useState<StoreSale[]>([]);
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all store data
  const fetchStoreData = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const [productsRes, shippingRes, salesRes, purchasesRes] = await Promise.all([
        supabase
          .from('store_products')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('store_shipping_costs')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('store_sales')
          .select('*')
          .eq('user_id', profileId)
          .order('sale_date', { ascending: false }),
        supabase
          .from('store_purchases')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false }),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (shippingRes.error) throw shippingRes.error;
      if (salesRes.error) throw salesRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      setProducts((productsRes.data || []) as StoreProduct[]);
      setShippingCosts((shippingRes.data || []) as StoreShippingCost[]);
      setSales((salesRes.data || []) as StoreSale[]);
      setPurchases((purchasesRes.data || []) as StorePurchase[]);
    } catch (error: any) {
      console.error('Error fetching store data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de la tienda',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profileId, toast]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Products with calculated fields
  const productsWithDetails = useMemo((): ProductWithDetails[] => {
    return products.map((product) => {
      const productShipping = shippingCosts.filter((s) => s.product_id === product.id);
      const productSales = sales.filter((s) => s.product_id === product.id);
      const productPurchases = purchases.filter((p) => p.product_id === product.id);
      
      const exchangeRate = Number(product.exchange_rate) || 1;
      const saleCurrency = product.sale_currency || 'DOP';
      const costCurrency = product.cost_currency || 'USD';
      
      // Helper to convert to sale currency
      const convertToSale = (amount: number, fromCurrency: string): number => {
        if (fromCurrency === saleCurrency) return amount;
        if (fromCurrency === 'USD' && saleCurrency === 'DOP') return amount * exchangeRate;
        if (fromCurrency === 'DOP' && saleCurrency === 'USD') return amount / exchangeRate;
        return amount;
      };
      
      // Purchases (weighted average cost per unit, converted to sale currency)
      const totalPurchasedQty = productPurchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const totalPurchasesConverted = productPurchases.reduce((sum, p) => {
        const fromCurrency = (p.cost_currency || costCurrency) as string;
        const unit = Number(p.unit_cost) || 0;
        const qty = Number(p.quantity) || 0;
        // For purchases, conversion should use the purchase exchange_rate if provided.
        const purchaseRate = Number(p.exchange_rate) || exchangeRate;
        const convertWithRate = (amount: number, from: string) => {
          if (from === saleCurrency) return amount;
          if (from === 'USD' && saleCurrency === 'DOP') return amount * purchaseRate;
          if (from === 'DOP' && saleCurrency === 'USD') return amount / purchaseRate;
          return amount;
        };
        return sum + convertWithRate(unit * qty, fromCurrency);
      }, 0);

      const averageUnitCostConverted = totalPurchasedQty > 0
        ? totalPurchasesConverted / totalPurchasedQty
        : convertToSale(Number(product.cost), costCurrency);
      
      // Calculate shipping costs from legacy table
      const legacyShippingCost = productShipping.reduce((sum, s) => sum + Number(s.cost), 0);
      const legacyShippingCostConverted = productShipping.reduce((sum, s) => {
        const shippingCurrency = s.cost_currency || 'USD';
        return sum + convertToSale(Number(s.cost), shippingCurrency);
      }, 0);

      // Calculate shipping costs from purchases
      const purchasesShippingCost = productPurchases.reduce((sum, p) => sum + (Number(p.shipping_cost) || 0), 0);
      const purchasesShippingCostConverted = productPurchases.reduce((sum, p) => {
        const fromCurrency = (p.cost_currency || costCurrency) as string;
        const purchaseRate = Number(p.exchange_rate) || exchangeRate;
        const convertWithRate = (amount: number, from: string) => {
          if (from === saleCurrency) return amount;
          if (from === 'USD' && saleCurrency === 'DOP') return amount * purchaseRate;
          if (from === 'DOP' && saleCurrency === 'USD') return amount / purchaseRate;
          return amount;
        };
        return sum + convertWithRate(Number(p.shipping_cost) || 0, fromCurrency);
      }, 0);

      const totalShippingCost = legacyShippingCost + purchasesShippingCost;
      const totalShippingCostConverted = legacyShippingCostConverted + purchasesShippingCostConverted;

      // Fallback to product.quantity_purchased for legacy products, but prefer purchase history when present.
      const qtyForInvestment = totalPurchasedQty > 0 ? totalPurchasedQty : product.quantity_purchased;
      const totalInvested = Number(product.cost) * qtyForInvestment + totalShippingCost;
      const totalInvestedConverted = totalPurchasesConverted + totalShippingCostConverted;
      
      const totalSold = productSales.reduce(
        (sum, s) => sum + Number(s.unit_price) * s.quantity,
        0
      );
      const totalQuantitySold = productSales.reduce((sum, s) => sum + s.quantity, 0);
      
      const costPerUnitConverted = qtyForInvestment > 0 
        ? totalInvestedConverted / qtyForInvestment
        : 0;
      const grossProfit = totalSold - (costPerUnitConverted * totalQuantitySold);

      const marginPerUnit = Number(product.price) - costPerUnitConverted;
      const profitPercentage = costPerUnitConverted > 0 ? (marginPerUnit / costPerUnitConverted) * 100 : 0;

      return {
        ...product,
        shippingCosts: productShipping,
        sales: productSales,
        purchases: productPurchases,
        totalShippingCost,
        totalShippingCostConverted,
        averageUnitCostConverted,
        marginPerUnit,
        profitPercentage,
        totalInvested,
        totalInvestedConverted,
        totalSold,
        grossProfit,
        costPerUnitConverted,
      };
    });
  }, [products, shippingCosts, sales, purchases]);

  // Financial summary
  const financialSummary = useMemo((): FinancialSummary => {
    // Resumen en moneda base (RD$/DOP). Esto evita mezclar USD/DOP en KPIs.
    const BASE_CURRENCY = 'DOP' as const;

    const productById = new Map(products.map((p) => [p.id, p] as const));

    const convertToBase = (amount: number, from: 'USD' | 'DOP', exchangeRate: number) => {
      const rate = Number(exchangeRate) || 1;
      if (from === BASE_CURRENCY) return amount;
      // USD -> DOP
      return amount * rate;
    };

    const purchasesByProduct = new Map<string, StorePurchase[]>();
    purchases.forEach((pu) => {
      const arr = purchasesByProduct.get(pu.product_id) || [];
      arr.push(pu);
      purchasesByProduct.set(pu.product_id, arr);
    });

    const totalProductsCost = products.reduce((sum, p) => {
      const related = purchasesByProduct.get(p.id) || [];
      if (related.length > 0) {
        const total = related.reduce((acc, pu) => {
          const from = (pu.cost_currency || p.cost_currency || 'USD') as 'USD' | 'DOP';
          const rate = Number(pu.exchange_rate) || Number(p.exchange_rate) || 1;
          const base = convertToBase(Number(pu.unit_cost) * (Number(pu.quantity) || 0), from, rate);
          return acc + base;
        }, 0);
        return sum + total;
      }

      const costCurrency = (p.cost_currency || 'USD') as 'USD' | 'DOP';
      const rate = Number(p.exchange_rate) || 1;
      const costBase = convertToBase(Number(p.cost), costCurrency, rate);
      return sum + costBase * p.quantity_purchased;
    }, 0);

    // Shipping from legacy store_shipping_costs table
    const legacyShippingCost = shippingCosts.reduce((sum, s) => {
      const product = productById.get(s.product_id);
      const rate = Number(product?.exchange_rate) || 1;
      const shippingCurrency = (s.cost_currency || 'USD') as 'USD' | 'DOP';
      const shippingBase = convertToBase(Number(s.cost), shippingCurrency, rate);
      return sum + shippingBase;
    }, 0);

    // Shipping from purchases (shipping_cost field in store_purchases)
    const purchasesShippingCost = purchases.reduce((sum, pu) => {
      const product = productById.get(pu.product_id);
      const from = (pu.cost_currency || product?.cost_currency || 'USD') as 'USD' | 'DOP';
      const rate = Number(pu.exchange_rate) || Number(product?.exchange_rate) || 1;
      const shippingBase = convertToBase(Number(pu.shipping_cost) || 0, from, rate);
      return sum + shippingBase;
    }, 0);

    const totalShippingCost = legacyShippingCost + purchasesShippingCost;

    const totalInvested = totalProductsCost + totalShippingCost;

    const totalSold = sales.reduce((sum, s) => {
      const product = productById.get(s.product_id);
      const saleCurrency = (product?.sale_currency || 'DOP') as 'USD' | 'DOP';
      const rate = Number(product?.exchange_rate) || 1;
      const saleBase = convertToBase(Number(s.unit_price) * s.quantity, saleCurrency, rate);
      return sum + saleBase;
    }, 0);

    const grossProfit = totalSold - totalInvested;

    // Most profitable product
    let mostProfitableProduct: { name: string; profit: number } | null = null;
    let maxProfit = 0;
    productsWithDetails.forEach((p) => {
      if ((p.grossProfit || 0) > maxProfit) {
        maxProfit = p.grossProfit || 0;
        mostProfitableProduct = { name: p.name, profit: maxProfit };
      }
    });

    // Most profitable month
    const monthlyProfits: Record<string, number> = {};
    sales.forEach((sale) => {
      const month = sale.sale_date.substring(0, 7); // YYYY-MM
      const saleAmount = Number(sale.unit_price) * sale.quantity;
      monthlyProfits[month] = (monthlyProfits[month] || 0) + saleAmount;
    });

    let mostProfitableMonth: { month: string; profit: number } | null = null;
    let maxMonthlyProfit = 0;
    Object.entries(monthlyProfits).forEach(([month, profit]) => {
      if (profit > maxMonthlyProfit) {
        maxMonthlyProfit = profit;
        mostProfitableMonth = { month, profit };
      }
    });

    return {
      totalInvested,
      totalProductsCost,
      totalShippingCost,
      totalSold,
      grossProfit,
      netProfit: grossProfit, // Sin gastos adicionales por ahora
      currency: BASE_CURRENCY,
      totalProducts: products.length,
      totalSales: sales.length,
      mostProfitableProduct,
      mostProfitableMonth,
    };
  }, [products, shippingCosts, sales, productsWithDetails, purchases]);

  // CRUD: Purchases
  const createPurchase = async (
    data: Omit<StorePurchase, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!profileId) return null;

    try {
      const { data: newPurchase, error } = await supabase
        .from('store_purchases')
        .insert({ ...data, user_id: profileId })
        .select()
        .single();

      if (error) throw error;

      setPurchases((prev) => [newPurchase as StorePurchase, ...prev]);

      // Update product stock and purchased qty
      const product = products.find((p) => p.id === data.product_id);
      if (product) {
        const qty = Number(data.quantity) || 0;
        const nextStock = (Number(product.stock) || 0) + qty;
        const nextPurchased = (Number(product.quantity_purchased) || 0) + qty;
        await updateProduct(data.product_id, {
          stock: nextStock,
          quantity_purchased: nextPurchased,
          status: nextStock > 0 ? 'activo' : product.status,
        });
      }

      toast({ title: 'Compra agregada', description: 'Se agregó la compra al historial' });
      return newPurchase;
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la compra',
        variant: 'destructive',
      });
      return null;
    }
  };

  // CRUD: Products
  const createProduct = async (
    data: Omit<StoreProduct, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!profileId) return null;

    try {
      const { data: newProduct, error } = await supabase
        .from('store_products')
        .insert({ ...data, user_id: profileId })
        .select()
        .single();

      if (error) throw error;

      setProducts((prev) => [newProduct as StoreProduct, ...prev]);
      toast({ title: 'Producto creado', description: 'El producto se agregó correctamente' });
      return newProduct;
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el producto',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProduct = async (id: string, data: Partial<StoreProduct>) => {
    try {
      const { error } = await supabase
        .from('store_products')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      toast({ title: 'Producto actualizado' });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el producto',
        variant: 'destructive',
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('store_products').delete().eq('id', id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setShippingCosts((prev) => prev.filter((s) => s.product_id !== id));
      setSales((prev) => prev.filter((s) => s.product_id !== id));
      toast({ title: 'Producto eliminado' });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive',
      });
    }
  };

  // CRUD: Shipping Costs
  const createShippingCost = async (
    data: Omit<StoreShippingCost, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!profileId) return null;

    try {
      const { data: newShipping, error } = await supabase
        .from('store_shipping_costs')
        .insert({ ...data, user_id: profileId })
        .select()
        .single();

      if (error) throw error;

      setShippingCosts((prev) => [newShipping as StoreShippingCost, ...prev]);
      toast({ title: 'Envío agregado' });
      return newShipping;
    } catch (error: any) {
      console.error('Error creating shipping cost:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el envío',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateShippingCost = async (id: string, data: Partial<StoreShippingCost>) => {
    try {
      const { error } = await supabase
        .from('store_shipping_costs')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setShippingCosts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      toast({ title: 'Envío actualizado' });
    } catch (error: any) {
      console.error('Error updating shipping cost:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el envío',
        variant: 'destructive',
      });
    }
  };

  const deleteShippingCost = async (id: string) => {
    try {
      const { error } = await supabase.from('store_shipping_costs').delete().eq('id', id);

      if (error) throw error;

      setShippingCosts((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Envío eliminado' });
    } catch (error: any) {
      console.error('Error deleting shipping cost:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el envío',
        variant: 'destructive',
      });
    }
  };

  // CRUD: Sales
  const createSale = async (data: Omit<StoreSale, 'id' | 'user_id' | 'created_at' | 'product'>) => {
    if (!profileId) return null;

    try {
      const { data: newSale, error } = await supabase
        .from('store_sales')
        .insert({ ...data, user_id: profileId })
        .select()
        .single();

      if (error) throw error;

      setSales((prev) => [newSale as StoreSale, ...prev]);

      // Actualizar stock del producto
      const product = products.find((p) => p.id === data.product_id);
      if (product) {
        const newStock = Math.max(0, product.stock - data.quantity);
        await updateProduct(data.product_id, {
          stock: newStock,
          status: newStock === 0 ? 'agotado' : product.status,
        });
      }

      toast({ title: 'Venta registrada' });
      return newSale;
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la venta',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateSale = async (id: string, data: Partial<StoreSale>) => {
    try {
      const { error } = await supabase.from('store_sales').update(data).eq('id', id);

      if (error) throw error;

      setSales((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      toast({ title: 'Venta actualizada' });
    } catch (error: any) {
      console.error('Error updating sale:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la venta',
        variant: 'destructive',
      });
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase.from('store_sales').delete().eq('id', id);

      if (error) throw error;

      setSales((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Venta eliminada' });
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la venta',
        variant: 'destructive',
      });
    }
  };

  const updatePurchase = async (id: string, data: Partial<StorePurchase>) => {
    try {
      // Get the original purchase to calculate stock difference
      const originalPurchase = purchases.find((p) => p.id === id);
      
      const { error } = await supabase
        .from('store_purchases')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );

      // Adjust product stock if quantity changed
      if (originalPurchase && data.quantity !== undefined) {
        const oldQty = Number(originalPurchase.quantity) || 0;
        const newQty = Number(data.quantity) || 0;
        const qtyDiff = newQty - oldQty;

        if (qtyDiff !== 0) {
          const product = products.find((p) => p.id === originalPurchase.product_id);
          if (product) {
            const nextStock = Math.max(0, (Number(product.stock) || 0) + qtyDiff);
            const nextPurchased = Math.max(0, (Number(product.quantity_purchased) || 0) + qtyDiff);
            await updateProduct(originalPurchase.product_id, {
              stock: nextStock,
              quantity_purchased: nextPurchased,
              status: nextStock === 0 ? 'agotado' : nextStock > 0 ? 'activo' : product.status,
            });
          }
        }
      }

      toast({ title: 'Compra actualizada' });
    } catch (error: any) {
      console.error('Error updating purchase:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la compra',
        variant: 'destructive',
      });
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      // Get the purchase to update product stock
      const purchase = purchases.find((p) => p.id === id);
      
      const { error } = await supabase.from('store_purchases').delete().eq('id', id);

      if (error) throw error;

      setPurchases((prev) => prev.filter((p) => p.id !== id));

      // Update product stock and quantity_purchased
      if (purchase) {
        const product = products.find((p) => p.id === purchase.product_id);
        if (product) {
          const qty = Number(purchase.quantity) || 0;
          const nextStock = Math.max(0, (Number(product.stock) || 0) - qty);
          const nextPurchased = Math.max(0, (Number(product.quantity_purchased) || 0) - qty);
          await updateProduct(purchase.product_id, {
            stock: nextStock,
            quantity_purchased: nextPurchased,
            status: nextStock === 0 ? 'agotado' : product.status,
          });
        }
      }

      toast({ title: 'Compra eliminada' });
    } catch (error: any) {
      console.error('Error deleting purchase:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la compra',
        variant: 'destructive',
      });
    }
  };

  return {
    products,
    shippingCosts,
    sales,
    purchases,
    productsWithDetails,
    financialSummary,
    loading,
    refetch: fetchStoreData,
    // Products
    createProduct,
    updateProduct,
    deleteProduct,
    // Purchases
    createPurchase,
    updatePurchase,
    deletePurchase,
    // Shipping
    createShippingCost,
    updateShippingCost,
    deleteShippingCost,
    // Sales
    createSale,
    updateSale,
    deleteSale,
  };
}
