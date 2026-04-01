-- ============================================
-- ATUALIZAR TABELA USERS PARA SISTEMA DE PERMISSÕES
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar novos campos na tabela users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS area TEXT CHECK (area IN ('tecnica', 'comercial', 'financeiro')),
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Atualizar constraint de role para incluir master e encarregado
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('master', 'admin', 'encarregado', 'user'));

-- 3. Definir Master (gabrieldesouza100@gmail.com)
UPDATE public.users
SET role = 'master'
WHERE email = 'gabrieldesouza100@gmail.com';

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_supervisor ON public.users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_area ON public.users(area);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 5. Verificar resultado
SELECT id, email, role, area, supervisor_id 
FROM public.users 
ORDER BY 
  CASE role 
    WHEN 'master' THEN 1 
    WHEN 'admin' THEN 2 
    WHEN 'encarregado' THEN 3 
    ELSE 4 
  END,
  email;


