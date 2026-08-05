-- ============================================================
-- Seed data for LOCAL Supabase dev stack.
-- Creates a confirmed admin account so the app can be logged into
-- immediately after `supabase start` / `supabase db reset`.
--
--   email:    admin@adaptlink.com
--   password: admin123456
--
-- The on_auth_user_created trigger populates public.users from the
-- user_metadata below (role = admin).
-- ============================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@adaptlink.com',
  crypt('admin123456', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Administrador", "name": "Administrador", "role": "admin"}',
  false, '', '', '', ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@adaptlink.com'
);

-- Ensure an email/password identity exists for the seeded user
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email = 'admin@adaptlink.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );
