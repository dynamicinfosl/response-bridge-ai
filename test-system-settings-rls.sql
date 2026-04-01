-- ============================================
-- TESTE: Verificar configurações RLS
-- ============================================
-- Execute este script para diagnosticar problemas com RLS
-- ============================================

-- 1. Verificar se a tabela existe
SELECT table_name, row_security 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'system_settings';

-- 2. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'system_settings';

-- 3. Verificar se a função is_admin existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_admin';

-- 4. Testar a função is_admin() (substitua pelo seu user_id)
SELECT public.is_admin() as is_current_user_admin;

-- 5. Verificar usuários e seus roles
SELECT id, email, role 
FROM users
WHERE email = 'admin@adaptlink.com';

-- 6. Verificar se o usuário atual tem role admin
SELECT 
  auth.uid() as current_user_id,
  u.id,
  u.email,
  u.role,
  (u.role = 'admin') as is_admin_role
FROM users u
WHERE u.id = auth.uid();



