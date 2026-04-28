-- ============================================================
-- dBaronX Admin Helper Function + User Roles Table
-- ============================================================

-- === dBaronX ADMIN HELPER FUNCTION (required for all new RLS policies) ===

CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Checks JWT claim set during Supabase auth
  RETURN COALESCE(
    (auth.jwt() ->> 'is_admin')::boolean,
    false
  );
END;
$$;

-- === User Roles Table (for future-proofing) ===

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy so only admins can see/manage roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.is_admin_from_auth());
