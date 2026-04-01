-- ============================================
-- CORREÇÃO COMPLETA: Sistema de configurações do n8n
-- ============================================
-- Execute este script completo para corrigir todos os problemas
-- ============================================

-- PASSO 1: Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON system_settings;

-- PASSO 2: Remover função antiga (se existir)
DROP FUNCTION IF EXISTS public.is_admin();

-- PASSO 3: Criar função helper para verificar se usuário é admin
-- SECURITY DEFINER permite que a função bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PASSO 4: Criar política para SELECT (todos autenticados podem ler)
CREATE POLICY "Authenticated users can view settings"
  ON system_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- PASSO 5: Criar política para INSERT/UPDATE/DELETE (apenas admins)
CREATE POLICY "Admins can manage settings"
  ON system_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PASSO 6: Verificar se tudo foi criado corretamente
SELECT 
  'Policies created:' as status,
  COUNT(*) as count
FROM pg_policies
WHERE tablename = 'system_settings';

-- PASSO 7: Testar a função (deve retornar true/false)
SELECT 
  'Function test:' as status,
  public.is_admin() as result;



