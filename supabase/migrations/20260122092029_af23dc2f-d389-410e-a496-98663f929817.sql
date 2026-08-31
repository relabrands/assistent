-- Create purchases table to support multiple purchase batches per product
CREATE TABLE IF NOT EXISTS public.store_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  cost_currency text NOT NULL DEFAULT 'DOP',
  exchange_rate numeric NULL DEFAULT 1,
  provider text NULL,
  purchase_date date NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_store_purchases_user_id ON public.store_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_product_id ON public.store_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_purchase_date ON public.store_purchases(purchase_date);

-- FK to store_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_purchases_product_id_fkey'
  ) THEN
    ALTER TABLE public.store_purchases
      ADD CONSTRAINT store_purchases_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.store_products(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Enable RLS
ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_purchases' AND policyname='Users can view their own purchases'
  ) THEN
    CREATE POLICY "Users can view their own purchases"
    ON public.store_purchases
    FOR SELECT
    USING (user_id = get_current_profile_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_purchases' AND policyname='Users can create their own purchases'
  ) THEN
    CREATE POLICY "Users can create their own purchases"
    ON public.store_purchases
    FOR INSERT
    WITH CHECK (user_id = get_current_profile_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_purchases' AND policyname='Users can update their own purchases'
  ) THEN
    CREATE POLICY "Users can update their own purchases"
    ON public.store_purchases
    FOR UPDATE
    USING (user_id = get_current_profile_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_purchases' AND policyname='Users can delete their own purchases'
  ) THEN
    CREATE POLICY "Users can delete their own purchases"
    ON public.store_purchases
    FOR DELETE
    USING (user_id = get_current_profile_id());
  END IF;
END$$;