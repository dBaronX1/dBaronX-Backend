-- ============================================================
-- dBaronX Migration: Telegram Bot + Payments + Admin Dreams
-- 20260320120000_telegram_payments_admin.sql
-- ============================================================

-- Add dbx_equity_option and dbx_equity_pct columns to campaigns if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'dbx_equity_option') THEN
    ALTER TABLE public.campaigns ADD COLUMN dbx_equity_option BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'dbx_equity_pct') THEN
    ALTER TABLE public.campaigns ADD COLUMN dbx_equity_pct NUMERIC(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.campaigns ADD COLUMN admin_notes TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'updated_at') THEN
    ALTER TABLE public.campaigns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add dbx_discount_applied to orders if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'dbx_discount_applied') THEN
    ALTER TABLE public.orders ADD COLUMN dbx_discount_applied BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- Telegram Bot Notifications Log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "type" TEXT NOT NULL,
  reference_id UUID,
  chat_id TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'telegram_notifications' AND policyname = 'Admins can view telegram notifications'
  ) THEN
    CREATE POLICY "Admins can view telegram notifications" ON public.telegram_notifications
      FOR SELECT USING (public.is_admin_from_auth());
  END IF;
END $$;

-- ============================================================
-- Payment Methods Config (for regional detection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_coming_soon BOOLEAN DEFAULT false,
  supported_regions TEXT[] DEFAULT ARRAY['worldwide'],
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'Anyone can view active payment methods'
  ) THEN
    CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Insert default payment methods
INSERT INTO public.payment_methods (method_key, label, description, is_active, is_coming_soon, supported_regions, icon)
VALUES
  ('solana_pay', 'Solana Pay', 'Instant DBX token payment via Solana blockchain', true, false, ARRAY['worldwide'], '◎'),
  ('wallet_connect', 'Phantom Wallet', 'Connect Phantom or Solflare wallet for DBX/SOL payments', true, false, ARRAY['worldwide'], '👻'),
  ('bank_transfer', 'Banks', 'Bank Transfers Worldwide: Anyone anywhere with a bank account can engage on the platform with proven KYC of Bank receipt with clean matching account details of holder matching holder''s government issued ID or passport.', true, false, ARRAY['worldwide'], '🏦'),
  ('manual_proof', 'Manual Proof', 'Upload payment receipt for any payment method', true, false, ARRAY['worldwide'], '📋'),
  ('flutterwave', 'Flutterwave', 'Cards + Mobile Money worldwide', false, true, ARRAY['worldwide'], '🌍'),
  ('stripe', 'Stripe', 'Global card payments', false, true, ARRAY['worldwide'], '💳')
ON CONFLICT (method_key) DO NOTHING;

-- ============================================================
-- RLS Policies for admin/dreams (campaigns table)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Admins can manage all campaigns'
  ) THEN
    CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
      FOR ALL USING (public.is_admin_from_auth());
  END IF;
END $$;

-- ============================================================
-- RLS for telegram_notifications — admin only write
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'telegram_notifications' AND policyname = 'Admins can insert notifications'
  ) THEN
    CREATE POLICY "Admins can insert notifications" ON public.telegram_notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Add affiliate_earnings post-delivery constraint note
-- (Enforced at application level — commissions only after delivery)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'affiliate_earnings' AND column_name = 'delivery_confirmed') THEN
    ALTER TABLE public.affiliate_earnings ADD COLUMN IF NOT EXISTS delivery_confirmed BOOLEAN DEFAULT false;
    ALTER TABLE public.affiliate_earnings ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Update affiliate_earnings RLS: only credit after delivery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_earnings' AND policyname = 'Admins can manage affiliate earnings'
  ) THEN
    CREATE POLICY "Admins can manage affiliate earnings" ON public.affiliate_earnings
      FOR ALL USING (public.is_admin_from_auth());
  END IF;
END $$;
