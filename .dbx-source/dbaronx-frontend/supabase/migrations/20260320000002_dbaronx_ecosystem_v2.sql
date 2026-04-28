-- ============================================================
-- dBaronX Ecosystem v2 — Impact Hub, Traceability, Blog
-- ============================================================

-- ============================================================
-- IMPACT METRICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  waste_processed_tons DECIMAL(12,3) DEFAULT 0,
  co2_saved_tons DECIMAL(12,3) DEFAULT 0,
  jobs_created INTEGER DEFAULT 0,
  farm_yield_kg DECIMAL(12,3) DEFAULT 0,
  biogas_kwh DECIMAL(12,3) DEFAULT 0,
  trees_planted INTEGER DEFAULT 0,
  water_saved_liters DECIMAL(12,3) DEFAULT 0,
  plastic_recycled_kg DECIMAL(12,3) DEFAULT 0,
  soap_bars_produced INTEGER DEFAULT 0,
  biochar_kg DECIMAL(12,3) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TRACEABILITY TABLE (Blockchain QR per product)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL DEFAULT '',
  qr_code_data TEXT NOT NULL DEFAULT '',
  solana_tx_hash TEXT DEFAULT '',
  farm_name TEXT DEFAULT '',
  farm_location TEXT DEFAULT '',
  harvest_date DATE,
  processing_date DATE,
  palm_kernel_source TEXT DEFAULT '',
  recycled_plastic_source TEXT DEFAULT '',
  waste_processed_kg DECIMAL(10,3) DEFAULT 0,
  co2_saved_kg DECIMAL(10,3) DEFAULT 0,
  jobs_supported INTEGER DEFAULT 0,
  certifications JSONB DEFAULT '[]',
  on_chain_metadata JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOG POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  category TEXT DEFAULT 'farm-stories',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CARBON CERTIFICATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carbon_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  co2_offset_kg DECIMAL(10,3) NOT NULL DEFAULT 0,
  certificate_number TEXT NOT NULL UNIQUE DEFAULT '',
  solana_mint_tx TEXT DEFAULT '',
  is_minted BOOLEAN DEFAULT false,
  pdf_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRODUCT REVIEWS TABLE (DBX-staked reviews)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  dbx_staked DECIMAL(10,4) DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ANONYMOUS SHIPPING OPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shipping_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'post_office',
  country TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_impact_metrics_date ON public.impact_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_traceability_product_id ON public.traceability(product_id);
CREATE INDEX IF NOT EXISTS idx_traceability_batch_id ON public.traceability(batch_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_carbon_certificates_order ON public.carbon_certificates(order_id);
CREATE INDEX IF NOT EXISTS idx_carbon_certificates_user ON public.carbon_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews(user_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_options ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Impact Metrics: public read, admin write
DROP POLICY IF EXISTS "public_read_impact_metrics" ON public.impact_metrics;
CREATE POLICY "public_read_impact_metrics" ON public.impact_metrics
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_impact_metrics" ON public.impact_metrics;
CREATE POLICY "admin_manage_impact_metrics" ON public.impact_metrics
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Traceability: public read
DROP POLICY IF EXISTS "public_read_traceability" ON public.traceability;
CREATE POLICY "public_read_traceability" ON public.traceability
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_traceability" ON public.traceability;
CREATE POLICY "admin_manage_traceability" ON public.traceability
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Blog Posts: public read published, auth write own
DROP POLICY IF EXISTS "public_read_published_blog_posts" ON public.blog_posts;
CREATE POLICY "public_read_published_blog_posts" ON public.blog_posts
FOR SELECT TO public USING (is_published = true);

DROP POLICY IF EXISTS "admin_manage_blog_posts" ON public.blog_posts;
CREATE POLICY "admin_manage_blog_posts" ON public.blog_posts
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Carbon Certificates: users see own
DROP POLICY IF EXISTS "users_read_own_carbon_certificates" ON public.carbon_certificates;
CREATE POLICY "users_read_own_carbon_certificates" ON public.carbon_certificates
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_carbon_certificates" ON public.carbon_certificates;
CREATE POLICY "admin_manage_carbon_certificates" ON public.carbon_certificates
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Product Reviews: public read approved, auth write own
DROP POLICY IF EXISTS "public_read_approved_reviews" ON public.product_reviews;
CREATE POLICY "public_read_approved_reviews" ON public.product_reviews
FOR SELECT TO public USING (is_approved = true);

DROP POLICY IF EXISTS "users_manage_own_reviews" ON public.product_reviews;
CREATE POLICY "users_manage_own_reviews" ON public.product_reviews
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Shipping Options: public read
DROP POLICY IF EXISTS "public_read_shipping_options" ON public.shipping_options;
CREATE POLICY "public_read_shipping_options" ON public.shipping_options
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_shipping_options" ON public.shipping_options;
CREATE POLICY "admin_manage_shipping_options" ON public.shipping_options
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- MOCK DATA
-- ============================================================
DO $$
DECLARE
  existing_product_id UUID;
  existing_user_id UUID;
BEGIN
  -- Impact Metrics mock data
  INSERT INTO public.impact_metrics (metric_date, waste_processed_tons, co2_saved_tons, jobs_created, farm_yield_kg, biogas_kwh, trees_planted, water_saved_liters, plastic_recycled_kg, soap_bars_produced, biochar_kg, notes)
  VALUES
    (CURRENT_DATE - INTERVAL '6 days', 2.4, 1.8, 12, 850, 320, 15, 45000, 180, 240, 95, 'Weekly batch — Accra facility'),
    (CURRENT_DATE - INTERVAL '5 days', 3.1, 2.3, 14, 920, 410, 18, 52000, 220, 310, 120, 'High yield day — palm kernel processing'),
    (CURRENT_DATE - INTERVAL '4 days', 2.8, 2.1, 13, 780, 380, 12, 48000, 195, 280, 108, 'Standard operations'),
    (CURRENT_DATE - INTERVAL '3 days', 3.5, 2.7, 16, 1050, 450, 20, 58000, 260, 350, 135, 'Record plastic recycling day'),
    (CURRENT_DATE - INTERVAL '2 days', 2.9, 2.2, 13, 890, 395, 14, 50000, 205, 295, 112, 'Biochar production focus'),
    (CURRENT_DATE - INTERVAL '1 day', 3.2, 2.4, 15, 960, 420, 17, 54000, 235, 320, 125, 'Soap batch + farm harvest'),
    (CURRENT_DATE, 1.8, 1.4, 10, 620, 280, 10, 38000, 145, 190, 82, 'Morning shift only')
  ON CONFLICT (id) DO NOTHING;

  -- Get existing product for traceability
  SELECT id INTO existing_product_id FROM public.products LIMIT 1;
  SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

  IF existing_product_id IS NOT NULL THEN
    INSERT INTO public.traceability (product_id, batch_id, qr_code_data, farm_name, farm_location, harvest_date, processing_date, palm_kernel_source, recycled_plastic_source, waste_processed_kg, co2_saved_kg, jobs_supported, is_verified)
    VALUES
      (existing_product_id, 'BATCH-AMK-2026-001', 'https://dbaronx.com/trace/BATCH-AMK-2026-001', 'Asante Palm Farm', 'Kumasi, Ashanti Region, Ghana', '2026-03-01', '2026-03-05', 'Asante Palm Farm — 120kg palm kernels, certified organic', 'Accra Recycling Hub — 45kg HDPE plastic diverted from landfill', 45.0, 28.5, 8, true),
      (existing_product_id, 'BATCH-AMK-2026-002', 'https://dbaronx.com/trace/BATCH-AMK-2026-002', 'Brong-Ahafo Cooperative', 'Sunyani, Brong-Ahafo, Ghana', '2026-03-08', '2026-03-12', 'Brong-Ahafo Cooperative — 95kg palm kernels, fair-trade certified', 'Tema Industrial Zone — 38kg mixed plastic recycled', 38.0, 24.2, 6, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Blog posts mock data
  INSERT INTO public.blog_posts (author_id, title, slug, excerpt, content, cover_image_url, category, tags, is_published, published_at)
  VALUES
    (existing_user_id, 'From Ghana Farm to Your Hands: The Amonkyi Soap Journey', 'amonkyi-soap-journey-ghana', 'Follow the complete journey of our flagship Amonkyi Natural Soap — from palm kernel harvest in Kumasi to your doorstep, with zero waste at every step.', 'The story of Amonkyi soap begins at dawn in the Ashanti Region of Ghana, where cooperative farmers harvest palm kernels using traditional methods refined over generations. Every kernel is hand-selected for quality, ensuring only the finest oils make it into our soap. The kernels travel 80km to our Accra processing facility, where they are cold-pressed to extract pure palm kernel oil. The remaining biomass becomes biochar — a soil amendment that sequesters carbon and improves farm yields. Meanwhile, our recycling team collects plastic waste from local communities, which is cleaned, shredded, and repurposed into packaging and construction materials. The result: a bar of soap that creates jobs, sequesters carbon, and leaves no waste behind.', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'farm-stories', ARRAY['soap', 'ghana', 'palm-kernel', 'zero-waste', 'circular-economy'], true, NOW() - INTERVAL '5 days'),
    (existing_user_id, 'Biochar: Turning Waste into Black Gold for Ghana Farms', 'biochar-black-gold-ghana-farms', 'How our biochar production process is transforming degraded farmland in Ghana while sequestering carbon and creating sustainable livelihoods.', 'Biochar — sometimes called black gold — is one of the most powerful tools in our circular economy toolkit. When we process palm kernels and agricultural waste at our Accra facility, the biomass that remains does not go to waste. Instead, it enters our pyrolysis unit, where it is heated in a low-oxygen environment to produce biochar. This porous, carbon-rich material is then mixed with compost and applied to degraded farmland across the Brong-Ahafo region. The results are remarkable: crop yields increase by 30-40% in the first season, water retention improves dramatically, and the carbon locked in the biochar stays in the soil for hundreds of years. Each ton of biochar we produce sequesters approximately 2.5 tons of CO2 equivalent — a verified, measurable climate impact that we track on-chain.', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', 'sustainability', ARRAY['biochar', 'carbon-sequestration', 'farming', 'ghana', 'climate'], true, NOW() - INTERVAL '3 days'),
    (existing_user_id, 'Plastic Pavers: How Accra Waste Becomes Dubai Driveways', 'plastic-pavers-accra-to-dubai', 'Our recycled plastic paver tiles are turning Accra landfill waste into durable construction materials exported globally — closing the loop on plastic pollution.', 'Every year, Ghana generates over 1 million tons of plastic waste, much of it ending up in waterways and landfills. Our recycled plastic paver program is changing that equation. We partner with waste pickers across Accra, Tema, and Kumasi to collect HDPE, PP, and LDPE plastics that would otherwise pollute the environment. The collected plastic is sorted, cleaned, and shredded at our facility, then melted and pressed into interlocking paver tiles that are stronger than concrete, UV-resistant, and 100% waterproof. These pavers are now being used in driveways, walkways, and public spaces across West Africa and the Middle East. Each square meter of pavers contains approximately 6kg of recycled plastic — plastic that will never enter the ocean.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'recycling', ARRAY['plastic', 'recycling', 'pavers', 'construction', 'circular-economy'], true, NOW() - INTERVAL '1 day')
  ON CONFLICT (slug) DO NOTHING;

  -- Shipping options mock data
  INSERT INTO public.shipping_options (name, type, country, city, address, instructions)
  VALUES
    ('Emirates Post — Dubai Main Office', 'post_office', 'UAE', 'Dubai', 'Emirates Post, Deira, Dubai', 'Collect with order number + any valid ID. No home address needed.'),
    ('Emirates Post — Abu Dhabi Central', 'post_office', 'UAE', 'Abu Dhabi', 'Emirates Post HQ, Hamdan Street, Abu Dhabi', 'Collect with order number + any valid ID.'),
    ('Ghana Post — Accra Central', 'post_office', 'Ghana', 'Accra', 'Ghana Post, High Street, Accra', 'Collect with order number + Ghana Card or passport.'),
    ('Ghana Post — Kumasi Main', 'post_office', 'Ghana', 'Kumasi', 'Ghana Post, Adum, Kumasi', 'Collect with order number + valid ID.'),
    ('Parcel Locker — Dubai Mall', 'parcel_locker', 'UAE', 'Dubai', 'Dubai Mall, Ground Floor, Near Entrance 1', '24/7 access. Use PIN code sent to your phone.'),
    ('Security Centre — Accra Airport', 'security_center', 'Ghana', 'Accra', 'Kotoka International Airport, Arrivals Hall', 'Available for international orders. Show order QR code.')
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion note: %', SQLERRM;
END $$;
