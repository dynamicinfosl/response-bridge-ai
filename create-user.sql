-- Script para criar usuário no Supabase
-- Execute este SQL no Supabase SQL Editor

-- 1. Primeiro, execute o script de setup da tabela users (se ainda não executou)
-- Copie e cole o conteúdo do arquivo supabase-setup.sql

-- 2. Depois, crie um usuário manualmente
-- Vá em Authentication > Users > Add User no painel do Supabase
-- Email: admin@adaptlink.com
-- Password: admin123456
-- Marque "Auto Confirm User" para não precisar confirmar email

-- 3. Ou execute este SQL para inserir diretamente na tabela users:
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@adaptlink.com',
  crypt('admin123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Administrador", "name": "Administrador"}',
  false,
  '',
  '',
  '',
  ''
);

-- 4. Depois insira na tabela users
INSERT INTO public.users (id, email, full_name, name, role)
SELECT 
  id, 
  email, 
  'Administrador',
  'Administrador',
  'admin'
FROM auth.users 
WHERE email = 'admin@adaptlink.com';
