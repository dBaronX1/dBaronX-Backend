-- ============================================================
-- dBaronX Full Upgrade Migration
-- 20260320200000_dbaronx_full_upgrade.sql
-- ============================================================

-- ============================================================
-- 1. Standardise admin check — drop old is_admin() if exists
-- ============================================================
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- is_admin_from_auth() already exists from 20260320034214_admin_helper.sql
-- No need to recreate it

-- ============================================================
-- 2. Fix UUID consistency on telegram_notifications
-- ============================================================
ALTER TABLE public.telegram_notifications
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================
-- 3. AI Stories table columns (add missing columns if needed)
-- ============================================================
ALTER TABLE public.ai_stories
  ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]';

-- ============================================================
-- 4. Campaigns equity columns
-- ============================================================
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS dbx_equity_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS dbx_equity_pct NUMERIC(5,2) DEFAULT 0;

-- ============================================================
-- 5. Pledges carbon + certificate columns
-- ============================================================
ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS carbon_kg DECIMAL(10,3) DEFAULT 0;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS certificate_url TEXT;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS equity_option BOOLEAN DEFAULT false;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS equity_pct NUMERIC(5,2) DEFAULT 0;

-- ============================================================
-- 6. User profiles public portfolio flag
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS public_portfolio BOOLEAN DEFAULT true;

-- ============================================================
-- 7. Watch-to-Earn trigger (loyalty points on ad_watches insert)
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_ad_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  PERFORM public.add_loyalty_points(NEW.user_id, NEW.points_earned);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_ad_watch ON public.ad_watches;
CREATE TRIGGER on_ad_watch
  AFTER INSERT ON public.ad_watches
  FOR EACH ROW EXECUTE FUNCTION public.award_ad_points();

-- ============================================================
-- 8. Backer portfolios view
-- ============================================================
CREATE OR REPLACE VIEW public.backer_portfolios AS
SELECT
  up.id AS user_id,
  up.full_name,
  up.wallet_address,
  SUM(p.amount_usd) AS total_usd,
  jsonb_agg(
    jsonb_build_object(
      'campaign', c.title,
      'amount', p.amount_usd,
      'date', p.created_at,
      'rewards', p.reward_tier,
      'carbon', p.carbon_kg
    )
  ) AS history
FROM public.user_profiles up
LEFT JOIN public.pledges p ON p.user_id = up.id
LEFT JOIN public.campaigns c ON c.id = p.campaign_id
GROUP BY up.id, up.full_name, up.wallet_address;

-- ============================================================
-- 9. ENUMs for delivery system
-- ============================================================
DROP TYPE IF EXISTS public.vehicle_type CASCADE;
CREATE TYPE public.vehicle_type AS ENUM (
  'bicycle', 'scooter', 'motorcycle', 'aboboyaa', 'piaggio', 'van', 'truck', 'other'
);

DROP TYPE IF EXISTS public.delivery_status CASCADE;
CREATE TYPE public.delivery_status AS ENUM (
  'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'
);

-- ============================================================
-- 10. Drivers table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'other'::public.vehicle_type,
  vehicle_plate TEXT DEFAULT '',
  license_verified BOOLEAN DEFAULT false,
  availability BOOLEAN DEFAULT true,
  current_location TEXT DEFAULT '',
  total_deliveries INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 5.00,
  earnings_dbx DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 11. Delivery jobs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  pledge_id UUID REFERENCES public.pledges(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status public.delivery_status DEFAULT 'pending'::public.delivery_status,
  pickup_location TEXT NOT NULL DEFAULT '',
  delivery_location JSONB NOT NULL DEFAULT '{}',
  estimated_time_minutes INTEGER,
  actual_time_minutes INTEGER,
  tracking_code TEXT UNIQUE,
  qr_code_url TEXT,
  carbon_offset_kg DECIMAL(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. Link delivery_job_id back to orders and pledges
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_job_id UUID REFERENCES public.delivery_jobs(id);

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS delivery_job_id UUID REFERENCES public.delivery_jobs(id);

-- ============================================================
-- 13. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drivers_availability ON public.drivers(availability);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON public.delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_tracking ON public.delivery_jobs(tracking_code);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_driver ON public.delivery_jobs(driver_id);

-- ============================================================
-- 14. Delivery completion trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NEW.status = 'delivered'::public.delivery_status THEN
    PERFORM public.add_loyalty_points(NEW.driver_id, 50);
    UPDATE public.drivers
      SET total_deliveries = total_deliveries + 1
      WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_delivery_complete ON public.delivery_jobs;
CREATE TRIGGER on_delivery_complete
  AFTER UPDATE ON public.delivery_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.complete_delivery();

-- ============================================================
-- 15. RLS for drivers
-- ============================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_manage_own" ON public.drivers;
CREATE POLICY "drivers_manage_own" ON public.drivers
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_full_drivers" ON public.drivers;
CREATE POLICY "admin_full_drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (public.is_admin_from_auth())
  WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "anyone_read_active_drivers" ON public.drivers;
CREATE POLICY "anyone_read_active_drivers" ON public.drivers
  FOR SELECT
  USING (availability = true);

-- ============================================================
-- 16. RLS for delivery_jobs
-- ============================================================
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_track_own_deliveries" ON public.delivery_jobs;
CREATE POLICY "users_track_own_deliveries" ON public.delivery_jobs
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    OR order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR pledge_id IN (SELECT id FROM public.pledges WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_deliveries" ON public.delivery_jobs;
CREATE POLICY "admin_manage_deliveries" ON public.delivery_jobs
  FOR ALL TO authenticated
  USING (public.is_admin_from_auth())
  WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "drivers_update_own_jobs" ON public.delivery_jobs;
CREATE POLICY "drivers_update_own_jobs" ON public.delivery_jobs
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());
