-- Review System: RLS Policies + Average Rating Function
-- product_reviews table already exists — only adding policies and helpers

-- Enable RLS (idempotent)
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "anyone_read_approved_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "users_insert_own_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "users_update_own_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "admin_manage_all_reviews" ON public.product_reviews;

-- Public can read approved reviews
CREATE POLICY "anyone_read_approved_reviews"
ON public.product_reviews
FOR SELECT
TO public
USING (is_approved = true);

-- Authenticated users can read their own reviews (even pending)
DROP POLICY IF EXISTS "users_read_own_reviews" ON public.product_reviews;
CREATE POLICY "users_read_own_reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can submit reviews
CREATE POLICY "users_insert_own_reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "users_update_own_reviews"
ON public.product_reviews
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "admin_manage_all_reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Function: get average rating for a product
CREATE OR REPLACE FUNCTION public.get_product_avg_rating(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
  FROM public.product_reviews
  WHERE product_id = p_product_id AND is_approved = true;
$$;

-- Function: get review count for a product
CREATE OR REPLACE FUNCTION public.get_product_review_count(p_product_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.product_reviews
  WHERE product_id = p_product_id AND is_approved = true;
$$;

-- Index for fast product review lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_is_approved ON public.product_reviews(is_approved);
