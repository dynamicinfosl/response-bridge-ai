-- ============================================
-- CORRIGIR: Atualizar role do usuário para admin
-- ============================================
-- Execute este script para atualizar o role do usuário atual para 'admin'
-- ============================================

-- Verificar usuários existentes e seus roles
SELECT id, email, role FROM users;

-- Atualizar o usuário logado para admin
-- Substitua 'admin@adaptlink.com' pelo email do usuário que você quer tornar admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@adaptlink.com';

-- OU atualizar pelo ID do usuário (substitua pelo ID real)
-- UPDATE users
-- SET role = 'admin'
-- WHERE id = '92d6deb5-df2d-4c25-ad14-4750e8b24f99';

-- Verificar se foi atualizado
SELECT id, email, role FROM users WHERE email = 'admin@adaptlink.com';



