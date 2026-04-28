-- ============================================================
-- dBaronX Platform Full Schema Migration
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('pending', 'proof_uploaded', 'approved', 'fulfilled', 'cancelled');

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM ('solana_pay', 'wallet_connect', 'manual_proof');

DROP TYPE IF EXISTS public.campaign_status CASCADE;
CREATE TYPE public.campaign_status AS ENUM ('pending', 'active', 'funded', 'cancelled');

DROP TYPE IF EXISTS public.payout_status CASCADE;
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role public.user_role DEFAULT 'user'::public.user_role,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  loyalty_points INTEGER DEFAULT 0,
  wallet_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products (Shop)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  price_dbx DECIMAL(10,4) DEFAULT 0,
  image_url TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  supplier_info TEXT DEFAULT '',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Orders (Shop)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_dbx DECIMAL(10,4) DEFAULT 0,
  payment_method public.payment_method DEFAULT 'manual_proof'::public.payment_method,
  payment_status public.order_status DEFAULT 'pending'::public.order_status,
  proof_url TEXT DEFAULT '',
  proof_notes TEXT DEFAULT '',
  shipping_address JSONB DEFAULT '{}',
  affiliate_code TEXT DEFAULT '',
  affiliate_commission DECIMAL(10,2) DEFAULT 0,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crowdfunding Campaigns (dBaronX Dreams)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  goal_usd DECIMAL(10,2) NOT NULL,
  raised_usd DECIMAL(10,2) DEFAULT 0,
  image_url TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  campaign_status public.campaign_status DEFAULT 'pending'::public.campaign_status,
  end_date TIMESTAMPTZ,
  rewards JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Pledges
CREATE TABLE IF NOT EXISTS public.pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL,
  payment_method public.payment_method DEFAULT 'manual_proof'::public.payment_method,
  proof_url TEXT DEFAULT '',
  payment_status public.order_status DEFAULT 'pending'::public.order_status,
  reward_tier TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AI Stories
CREATE TABLE IF NOT EXISTS public.ai_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT DEFAULT '',
  genre TEXT DEFAULT 'general',
  chapters JSONB DEFAULT '[]',
  is_series BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ad Videos (Watch & Earn)
CREATE TABLE IF NOT EXISTS public.ad_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  duration_seconds INTEGER DEFAULT 30,
  points_reward INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ad Watch Records
CREATE TABLE IF NOT EXISTS public.ad_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.ad_videos(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  watched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Affiliates
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  status public.payout_status DEFAULT 'pending'::public.payout_status,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payout Requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  wallet_address TEXT NOT NULL,
  payment_method TEXT DEFAULT 'crypto',
  status public.payout_status DEFAULT 'pending'::public.payout_status,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Proof of Payment uploads (storage references)
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL, -- 'order' or 'pledge'
  file_url TEXT NOT NULL,
  file_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_pledges_campaign_id ON public.pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pledges_user_id ON public.pledges(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_stories_user_id ON public.ai_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_watches_user_id ON public.ad_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON public.affiliate_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ref_code TEXT;
BEGIN
  ref_code := upper(substring(md5(NEW.id::text) from 1 for 8));
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.user_role,
    ref_code
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = auth.uid()
  AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
)
$$;

-- Add loyalty points
CREATE OR REPLACE FUNCTION public.add_loyalty_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET loyalty_points = loyalty_points + p_points,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles" ON public.user_profiles
FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_full_access_user_profiles" ON public.user_profiles
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "public_read_user_profiles" ON public.user_profiles;
CREATE POLICY "public_read_user_profiles" ON public.user_profiles
FOR SELECT TO public USING (true);

-- products
DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_products" ON public.products;
CREATE POLICY "admin_manage_products" ON public.products
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- orders
DROP POLICY IF EXISTS "users_manage_own_orders" ON public.orders;
CREATE POLICY "users_manage_own_orders" ON public.orders
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_orders" ON public.orders;
CREATE POLICY "admin_manage_orders" ON public.orders
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- campaigns
DROP POLICY IF EXISTS "public_read_active_campaigns" ON public.campaigns;
CREATE POLICY "public_read_active_campaigns" ON public.campaigns
FOR SELECT TO public USING (campaign_status = 'active'::public.campaign_status);

DROP POLICY IF EXISTS "users_manage_own_campaigns" ON public.campaigns;
CREATE POLICY "users_manage_own_campaigns" ON public.campaigns
FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_campaigns" ON public.campaigns;
CREATE POLICY "admin_manage_campaigns" ON public.campaigns
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pledges
DROP POLICY IF EXISTS "users_manage_own_pledges" ON public.pledges;
CREATE POLICY "users_manage_own_pledges" ON public.pledges
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_pledges" ON public.pledges;
CREATE POLICY "admin_manage_pledges" ON public.pledges
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ai_stories
DROP POLICY IF EXISTS "users_manage_own_ai_stories" ON public.ai_stories;
CREATE POLICY "users_manage_own_ai_stories" ON public.ai_stories
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ad_videos
DROP POLICY IF EXISTS "public_read_ad_videos" ON public.ad_videos;
CREATE POLICY "public_read_ad_videos" ON public.ad_videos
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_ad_videos" ON public.ad_videos;
CREATE POLICY "admin_manage_ad_videos" ON public.ad_videos
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ad_watches
DROP POLICY IF EXISTS "users_manage_own_ad_watches" ON public.ad_watches;
CREATE POLICY "users_manage_own_ad_watches" ON public.ad_watches
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_read_ad_watches" ON public.ad_watches;
CREATE POLICY "admin_read_ad_watches" ON public.ad_watches
FOR SELECT TO authenticated USING (public.is_admin());

-- affiliate_earnings
DROP POLICY IF EXISTS "users_read_own_affiliate_earnings" ON public.affiliate_earnings;
CREATE POLICY "users_read_own_affiliate_earnings" ON public.affiliate_earnings
FOR SELECT TO authenticated USING (affiliate_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_affiliate_earnings" ON public.affiliate_earnings;
CREATE POLICY "admin_manage_affiliate_earnings" ON public.affiliate_earnings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payout_requests
DROP POLICY IF EXISTS "users_manage_own_payout_requests" ON public.payout_requests;
CREATE POLICY "users_manage_own_payout_requests" ON public.payout_requests
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_payout_requests" ON public.payout_requests;
CREATE POLICY "admin_manage_payout_requests" ON public.payout_requests
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payment_proofs
DROP POLICY IF EXISTS "users_manage_own_payment_proofs" ON public.payment_proofs;
CREATE POLICY "users_manage_own_payment_proofs" ON public.payment_proofs
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_payment_proofs" ON public.payment_proofs;
CREATE POLICY "admin_manage_payment_proofs" ON public.payment_proofs
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MOCK DATA
-- ============================================================
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  user_uuid UUID := gen_random_uuid();
  prod1_uuid UUID := gen_random_uuid();
  prod2_uuid UUID := gen_random_uuid();
  prod3_uuid UUID := gen_random_uuid();
  prod4_uuid UUID := gen_random_uuid();
  camp1_uuid UUID := gen_random_uuid();
  camp2_uuid UUID := gen_random_uuid();
  ad1_uuid UUID := gen_random_uuid();
  ad2_uuid UUID := gen_random_uuid();
  ad3_uuid UUID := gen_random_uuid();
BEGIN
  -- Create admin user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@dbaronx.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'dBaronX Admin', 'role', 'admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Create regular user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    user_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'user@dbaronx.com', crypt('user123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Demo User'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Products
  INSERT INTO public.products (id, name, description, price, price_dbx, image_url, category, stock, is_active, supplier_info, created_by)
  VALUES
    (prod1_uuid, 'Natural Eco Soap Bar', 'Handcrafted organic soap with shea butter and essential oils. Zero plastic packaging, eco-certified.', 12.99, 45.00, 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400', 'health', 100, true, 'EcoSoap Suppliers Ltd', admin_uuid),
    (prod2_uuid, 'DBX Wellness Bundle', 'Premium health supplement bundle: probiotics, vitamin C, omega-3. Pay with DBX for 15% extra discount.', 49.99, 175.00, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'health', 50, true, 'NaturalHealth Co', admin_uuid),
    (prod3_uuid, 'Eco Dropship Starter Kit', 'Everything you need to start your eco-dropshipping business. Includes supplier list, templates, and DBX discount codes.', 29.99, 105.00, 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400', 'business', 200, true, 'dBaronX Digital', admin_uuid),
    (prod4_uuid, 'dBaronX Branded Hoodie', 'Premium quality hoodie with embroidered dBaronX logo. Sustainable cotton blend.', 39.99, 140.00, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400', 'merch', 75, true, 'EcoMerch Factory', admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- Campaigns
  INSERT INTO public.campaigns (id, creator_id, title, description, goal_usd, raised_usd, image_url, category, campaign_status, end_date, rewards)
  VALUES
    (camp1_uuid, admin_uuid, 'Green Recycling Hub Africa', 'Building a community recycling center in West Africa. Every pledge helps reduce plastic waste and creates local jobs. Open to backers from any country.', 50000.00, 18750.00, 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400', 'environment', 'active'::public.campaign_status, now() + interval '60 days',
    '[{"tier": "Supporter", "amount": 25, "reward": "DBX tokens + digital certificate"}, {"tier": "Champion", "amount": 100, "reward": "DBX tokens + exclusive NFT + name on hub wall"}, {"tier": "Founder", "amount": 500, "reward": "All above + equity share + lifetime discount"}]'::jsonb),
    (camp2_uuid, admin_uuid, 'dBaronX Organic Farm Network', 'Connecting small organic farmers globally with direct-to-consumer dropshipping. No middlemen, fair prices, eco-certified produce.', 25000.00, 8200.00, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400', 'agriculture', 'active'::public.campaign_status, now() + interval '45 days',
    '[{"tier": "Seed", "amount": 50, "reward": "Monthly farm box + DBX tokens"}, {"tier": "Harvest", "amount": 200, "reward": "Quarterly farm box + DBX tokens + co-op membership"}]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Ad Videos
  INSERT INTO public.ad_videos (id, title, video_url, thumbnail_url, duration_seconds, points_reward, is_active)
  VALUES
    (ad1_uuid, 'dBaronX Ecosystem Overview', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400', 60, 25, true),
    (ad2_uuid, 'Solana Pay Tutorial', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400', 45, 20, true),
    (ad3_uuid, 'Eco Commerce Revolution', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1542601906897-ecd0f7f8a4a2?w=400', 30, 15, true)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion error: %', SQLERRM;
END $$;
