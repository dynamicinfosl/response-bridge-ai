-- ============================================
-- CORREÇÃO: Remover política antiga e criar função helper
-- ============================================
-- Execute este script no SQL Editor do Supabase para corrigir o erro de recursão infinita
-- ============================================

-- Remover política antiga que causa recursão
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;

-- Criar função helper para verificar se usuário é admin (bypassa RLS usando SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recriar política usando a função helper
-- USING para SELECT/UPDATE/DELETE, WITH CHECK para INSERT/UPDATE
CREATE POLICY "Admins can manage settings"
  ON system_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

