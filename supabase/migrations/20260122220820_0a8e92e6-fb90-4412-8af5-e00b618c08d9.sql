-- Create product variations table
CREATE TABLE public.store_product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  color TEXT,
  size TEXT,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add variation_id to purchases (optional - for purchases of specific variations)
ALTER TABLE public.store_purchases 
ADD COLUMN variation_id UUID REFERENCES public.store_product_variations(id) ON DELETE SET NULL;

-- Add variation_id to sales (optional - for sales of specific variations)
ALTER TABLE public.store_sales
ADD COLUMN variation_id UUID REFERENCES public.store_product_variations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.store_product_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for variations
CREATE POLICY "Users can view their own variations"
ON public.store_product_variations
FOR SELECT
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can create their own variations"
ON public.store_product_variations
FOR INSERT
WITH CHECK (user_id = get_current_profile_id());

CREATE POLICY "Users can update their own variations"
ON public.store_product_variations
FOR UPDATE
USING (user_id = get_current_profile_id());

CREATE POLICY "Users can delete their own variations"
ON public.store_product_variations
FOR DELETE
USING (user_id = get_current_profile_id());

-- Trigger for updated_at
CREATE TRIGGER update_store_product_variations_updated_at
BEFORE UPDATE ON public.store_product_variations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();