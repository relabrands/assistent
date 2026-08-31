-- ============================================
-- MÓDULO: GESTIÓN DE TIENDA ONLINE (PERSONAL)
-- ============================================

-- Enum para categorías de productos
CREATE TYPE public.product_category AS ENUM ('pulseras', 'accesorios', 'ropa', 'tecnologia', 'otros');

-- Enum para estado del producto
CREATE TYPE public.product_status AS ENUM ('activo', 'agotado', 'descontinuado');

-- Enum para estado de envío
CREATE TYPE public.shipping_status AS ENUM ('pagado', 'pendiente');

-- Enum para estado de venta
CREATE TYPE public.sale_status AS ENUM ('pagada', 'pendiente', 'cancelada');

-- Enum para método de pago
CREATE TYPE public.payment_method AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'paypal', 'otro');

-- ============================================
-- TABLA: store_products (Productos)
-- ============================================
CREATE TABLE public.store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'otros',
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  provider TEXT,
  purchase_date DATE,
  quantity_purchased INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  status product_status NOT NULL DEFAULT 'activo',
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Policies: Solo el usuario puede ver/gestionar sus productos
CREATE POLICY "Users can view their own products"
ON public.store_products FOR SELECT
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can create their own products"
ON public.store_products FOR INSERT
WITH CHECK (user_id = get_current_profile_id());

CREATE POLICY "Users can update their own products"
ON public.store_products FOR UPDATE
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can delete their own products"
ON public.store_products FOR DELETE
USING (user_id = get_current_profile_id());

-- ============================================
-- TABLA: store_shipping_costs (Costos de Envío)
-- ============================================
CREATE TABLE public.store_shipping_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  shipping_type TEXT NOT NULL DEFAULT 'Envío 1',
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_date DATE,
  provider TEXT,
  status shipping_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_shipping_costs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own shipping costs"
ON public.store_shipping_costs FOR SELECT
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can create their own shipping costs"
ON public.store_shipping_costs FOR INSERT
WITH CHECK (user_id = get_current_profile_id());

CREATE POLICY "Users can update their own shipping costs"
ON public.store_shipping_costs FOR UPDATE
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can delete their own shipping costs"
ON public.store_shipping_costs FOR DELETE
USING (user_id = get_current_profile_id());

-- ============================================
-- TABLA: store_sales (Ventas)
-- ============================================
CREATE TABLE public.store_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  client_name TEXT,
  client_contact TEXT,
  payment_method payment_method NOT NULL DEFAULT 'efectivo',
  status sale_status NOT NULL DEFAULT 'pagada',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_sales ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sales"
ON public.store_sales FOR SELECT
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can create their own sales"
ON public.store_sales FOR INSERT
WITH CHECK (user_id = get_current_profile_id());

CREATE POLICY "Users can update their own sales"
ON public.store_sales FOR UPDATE
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can delete their own sales"
ON public.store_sales FOR DELETE
USING (user_id = get_current_profile_id());

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE TRIGGER update_store_products_updated_at
BEFORE UPDATE ON public.store_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ÍNDICES para mejor rendimiento
-- ============================================
CREATE INDEX idx_store_products_user_id ON public.store_products(user_id);
CREATE INDEX idx_store_products_category ON public.store_products(category);
CREATE INDEX idx_store_products_status ON public.store_products(status);
CREATE INDEX idx_store_shipping_costs_product_id ON public.store_shipping_costs(product_id);
CREATE INDEX idx_store_shipping_costs_user_id ON public.store_shipping_costs(user_id);
CREATE INDEX idx_store_sales_product_id ON public.store_sales(product_id);
CREATE INDEX idx_store_sales_user_id ON public.store_sales(user_id);
CREATE INDEX idx_store_sales_date ON public.store_sales(sale_date);