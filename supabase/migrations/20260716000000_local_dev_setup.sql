-- ============================================================
-- Local development schema for Response Bridge AI
-- Consolidates the repo's root SQL scripts (supabase-setup.sql +
-- supabase-update-users-permissions.sql) so `supabase start` /
-- `supabase db reset` reproduces a working local auth backend.
--
-- NOTE: This migration only exists to support the LOCAL Supabase
-- stack used for development/testing. Production uses a hosted
-- Supabase project configured separately.
-- ============================================================

-- Users profile table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  area TEXT CHECK (area IN ('tecnica', 'comercial', 'financeiro')),
  supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  chatwoot_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Role constraint including master/encarregado
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('master', 'admin', 'encarregado', 'user'));

CREATE INDEX IF NOT EXISTS idx_users_supervisor ON public.users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_area ON public.users(area);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Table-level grants (PostgREST executes as anon/authenticated roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Own-profile policies. The upstream "Admins can view all profiles"
-- policy from supabase-setup.sql is intentionally omitted here because
-- its self-referential subquery on public.users triggers
-- "infinite recursion detected in policy" (error 42P17).
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
