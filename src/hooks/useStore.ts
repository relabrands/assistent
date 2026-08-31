import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  StoreProduct,
  StoreShippingCost,
  StoreSale,
  StorePurchase,
  ProductWithDetails,
  FinancialSummary,
} from '@/types/store';

export function useStore(profileId: string | undefined) {
  const { toast } = useToast();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [shippingCosts, setShippingCosts] = useState<StoreShippingCost[]>([]);
  const [sales, setSales] = useState<StoreSale[]>([]);
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setProducts([]);
      setShippingCosts([]);
      setSales([]);
      setPurchases([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const qProducts = query(collection(db, 'store_products'), where('user_id', '==', profileId));
    const qShipping = query(collection(db, 'store_shipping_costs'), where('user_id', '==', profileId));
    const qSales = query(collection(db, 'store_sales'), where('user_id', '==', profileId));
    const qPurchases = query(collection(db, 'store_purchases'), where('user_id', '==', profileId));

    const unsubProducts = onSnapshot(qProducts, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreProduct));
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setProducts(items);
      setLoading(false);
    });

    const unsubShipping = onSnapshot(qShipping, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreShippingCost));
      setShippingCosts(items);
    });

    const unsubSales = onSnapshot(qSales, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreSale));
      items.sort((a, b) => new Date(b.sale_date || 0).getTime() - new Date(a.sale_date || 0).getTime());
      setSales(items);
    });

    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StorePurchase));
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setPurchases(items);
    });

    return () => {
      unsubProducts();
      unsubShipping();
      unsubSales();
      unsubPurchases();
    };
  }, [profileId]);

  // Products with calculated fields
  const productsWithDetails = useMemo((): ProductWithDetails[] => {
    return products.map((product) => {
      const productShipping = shippingCosts.filter((s) => s.product_id === product.id);
      const productSales = sales.filter((s) => s.product_id === product.id);
      const productPurchases = purchases.filter((p) => p.product_id === product.id);

      const totalShippingCost = productShipping.reduce((sum, s) => sum + Number(s.cost), 0);
      const totalShippingCostConverted = totalShippingCost * (Number(product.exchange_rate) || 1);

      const qtyForInvestment = productPurchases.length > 0
        ? productPurchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
        : Number(product.quantity_purchased) || 0;

      const totalInvested = productPurchases.length > 0
        ? productPurchases.reduce((sum, p) => sum + (Number(p.unit_cost) * Number(p.quantity)), 0) + totalShippingCost
        : (Number(product.cost) * qtyForInvestment) + totalShippingCost;

      const totalInvestedConverted = totalInvested * (Number(product.exchange_rate) || 1);
      const averageUnitCostConverted = qtyForInvestment > 0 ? totalInvestedConverted / qtyForInvestment : 0;

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
    const BASE_CURRENCY = 'DOP' as const;
    const productById = new Map(products.map((p) => [p.id, p] as const));

    const convertToBase = (amount: number, from: 'USD' | 'DOP', exchangeRate: number) => {
      const rate = Number(exchangeRate) || 1;
      if (from === BASE_CURRENCY) return amount;
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

    const legacyShippingCost = shippingCosts.reduce((sum, s) => {
      const product = productById.get(s.product_id);
      const rate = Number(product?.exchange_rate) || 1;
      const shippingCurrency = (s.cost_currency || 'USD') as 'USD' | 'DOP';
      const shippingBase = convertToBase(Number(s.cost), shippingCurrency, rate);
      return sum + shippingBase;
    }, 0);

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

    let mostProfitableProduct: { name: string; profit: number } | null = null;
    let maxProfit = 0;
    productsWithDetails.forEach((p) => {
      if ((p.grossProfit || 0) > maxProfit) {
        maxProfit = p.grossProfit || 0;
        mostProfitableProduct = { name: p.name, profit: maxProfit };
      }
    });

    let mostProfitableMonth: { month: string; profit: number } | null = null;
    let maxMonthlyProfit = 0;
    const monthlyProfits: Record<string, number> = {};
    sales.forEach((sale) => {
      const month = (sale.sale_date || '').substring(0, 7);
      const saleAmount = Number(sale.unit_price) * sale.quantity;
      monthlyProfits[month] = (monthlyProfits[month] || 0) + saleAmount;
    });

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
      netProfit: grossProfit,
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
      const newPurchase = {
        ...data,
        user_id: profileId,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'store_purchases'), newPurchase);

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
      return { id: docRef.id, ...newPurchase } as StorePurchase;
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
      const newProduct = {
        ...data,
        user_id: profileId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'store_products'), newProduct);
      toast({ title: 'Producto creado', description: 'El producto se agregó correctamente' });
      return { id: docRef.id, ...newProduct } as StoreProduct;
    } catch (error: any) {
      console.error('Error creating product in Firestore:', error);
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
      await updateDoc(doc(db, 'store_products', id), {
        ...data,
        updated_at: new Date().toISOString(),
      });
      toast({ title: 'Producto actualizado' });
    } catch (error: any) {
      console.error('Error updating product in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el producto',
        variant: 'destructive',
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'store_products', id));
      toast({ title: 'Producto eliminado' });
    } catch (error: any) {
      console.error('Error deleting product in Firestore:', error);
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
      const newShipping = {
        ...data,
        user_id: profileId,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'store_shipping_costs'), newShipping);
      toast({ title: 'Envío agregado' });
      return { id: docRef.id, ...newShipping } as StoreShippingCost;
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
      await updateDoc(doc(db, 'store_shipping_costs', id), data);
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
      await deleteDoc(doc(db, 'store_shipping_costs', id));
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
      const newSale = {
        ...data,
        user_id: profileId,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'store_sales'), newSale);

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
      return { id: docRef.id, ...newSale } as StoreSale;
    } catch (error: any) {
      console.error('Error creating sale in Firestore:', error);
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
      await updateDoc(doc(db, 'store_sales', id), data);
      toast({ title: 'Venta actualizada' });
    } catch (error: any) {
      console.error('Error updating sale in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la venta',
        variant: 'destructive',
      });
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'store_sales', id));
      toast({ title: 'Venta eliminada' });
    } catch (error: any) {
      console.error('Error deleting sale in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la venta',
        variant: 'destructive',
      });
    }
  };

  const updatePurchase = async (id: string, data: Partial<StorePurchase>) => {
    try {
      const originalPurchase = purchases.find((p) => p.id === id);
      await updateDoc(doc(db, 'store_purchases', id), data);

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
      console.error('Error updating purchase in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la compra',
        variant: 'destructive',
      });
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const purchase = purchases.find((p) => p.id === id);
      await deleteDoc(doc(db, 'store_purchases', id));

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
      console.error('Error deleting purchase in Firestore:', error);
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
    refetch: () => {},
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
