-- Add currency support to store_products
ALTER TABLE public.store_products
ADD COLUMN IF NOT EXISTS cost_currency TEXT NOT NULL DEFAULT 'DOP',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1,
ADD COLUMN IF NOT EXISTS sale_currency TEXT NOT NULL DEFAULT 'DOP';

-- Add currency support to store_shipping_costs
ALTER TABLE public.store_shipping_costs
ADD COLUMN IF NOT EXISTS cost_currency TEXT NOT NULL DEFAULT 'DOP';

-- Add comments for clarity
COMMENT ON COLUMN public.store_products.cost_currency IS 'Currency for product cost (USD or DOP)';
COMMENT ON COLUMN public.store_products.exchange_rate IS 'Exchange rate from cost_currency to sale_currency';
COMMENT ON COLUMN public.store_products.sale_currency IS 'Currency for sale price (typically DOP)';
COMMENT ON COLUMN public.store_shipping_costs.cost_currency IS 'Currency for shipping cost (USD or DOP)';