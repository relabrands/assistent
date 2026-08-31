// Tipos para el módulo de Gestión de Tienda Online

export type ProductCategory = 'pulseras' | 'accesorios' | 'ropa' | 'tecnologia' | 'otros';
export type ProductStatus = 'activo' | 'agotado' | 'descontinuado';
export type ShippingStatus = 'pagado' | 'pendiente';
export type SaleStatus = 'pagada' | 'pendiente' | 'cancelada';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'paypal' | 'otro';
export type CurrencyCode = 'USD' | 'DOP';

export interface StoreProduct {
  id: string;
  user_id: string;
  name: string;
  category: ProductCategory;
  cost: number;
  price: number;
  provider: string | null;
  purchase_date: string | null;
  quantity_purchased: number;
  stock: number;
  status: ProductStatus;
  image_url: string | null;
  notes: string | null;
  cost_currency: CurrencyCode;
  exchange_rate: number;
  sale_currency: CurrencyCode;
  created_at: string;
  updated_at: string;
}

export interface StoreShippingCost {
  id: string;
  user_id: string;
  product_id: string;
  shipping_type: string;
  cost: number;
  shipping_date: string | null;
  provider: string | null;
  status: ShippingStatus;
  notes: string | null;
  cost_currency: CurrencyCode;
  created_at: string;
}

export interface StoreSale {
  id: string;
  user_id: string;
  product_id: string;
  variation_id: string | null;
  sale_date: string;
  quantity: number;
  unit_price: number;
  client_name: string | null;
  client_contact: string | null;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  // Joined data
  product?: StoreProduct;
  variation?: StoreProductVariation;
}

export interface StoreProductVariation {
  id: string;
  user_id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  stock: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorePurchase {
  id: string;
  user_id: string;
  product_id: string;
  variation_id: string | null;
  quantity: number;
  unit_cost: number;
  cost_currency: CurrencyCode;
  /**
   * Tasa usada para convertir USD -> DOP en esta compra.
   * Si cost_currency es DOP, normalmente será 1.
   */
  exchange_rate: number | null;
  /**
   * Costo de envío de esta compra específica.
   * Usa la misma moneda que cost_currency.
   */
  shipping_cost: number;
  provider: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  variation?: StoreProductVariation;
}

export interface ProductWithDetails extends StoreProduct {
  shippingCosts?: StoreShippingCost[];
  sales?: StoreSale[];
  purchases?: StorePurchase[];
  // Campos calculados
  totalShippingCost?: number;
  totalShippingCostConverted?: number;
  averageUnitCostConverted?: number;
  marginPerUnit?: number;
  profitPercentage?: number;
  totalInvested?: number;
  totalInvestedConverted?: number;
  totalSold?: number;
  grossProfit?: number;
  costPerUnitConverted?: number;
}

export interface FinancialSummary {
  totalInvested: number;
  totalProductsCost: number;
  totalShippingCost: number;
  totalSold: number;
  grossProfit: number;
  netProfit: number;
  /** Moneda en la que está expresado el resumen (por ahora, siempre DOP/RD$). */
  currency: CurrencyCode;
  totalProducts: number;
  totalSales: number;
  mostProfitableProduct: { name: string; profit: number } | null;
  mostProfitableMonth: { month: string; profit: number } | null;
}

// Labels para UI
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pulseras: 'Pulseras',
  accesorios: 'Accesorios',
  ropa: 'Ropa',
  tecnologia: 'Tecnología',
  otros: 'Otros',
};

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  pulseras: '📿',
  accesorios: '👜',
  ropa: '👕',
  tecnologia: '📱',
  otros: '📦',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  activo: 'Activo',
  agotado: 'Agotado',
  descontinuado: 'Descontinuado',
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  paypal: 'PayPal',
  otro: 'Otro',
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'USD ($)',
  DOP: 'RD$ (DOP)',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  DOP: 'RD$',
};
