-- ============================================
-- CONFIGURAÇÕES DO SISTEMA (n8n URLs)
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
-- ============================================

-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Comentário na tabela
COMMENT ON TABLE system_settings IS 'Configurações do sistema, incluindo URLs do n8n';

-- Habilitar RLS (Row Level Security)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se usuário é admin (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Política: Apenas usuários autenticados podem ver configurações
CREATE POLICY "Authenticated users can view settings"
  ON system_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Apenas admins podem inserir/atualizar configurações
-- USING para SELECT/UPDATE/DELETE, WITH CHECK para INSERT/UPDATE
CREATE POLICY "Admins can manage settings"
  ON system_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inserir configurações padrão do n8n (se não existirem)
INSERT INTO system_settings (key, value, description)
VALUES 
  ('n8n_api_url', '', 'URL base do n8n (ex: https://seu-n8n.com/webhook/api-frontend)'),
  ('n8n_api_key', '', 'API Key do n8n (opcional, deixe vazio se não precisar)'),
  ('n8n_webhook_chats', '', 'URL do webhook para buscar chats'),
  ('n8n_webhook_messages', '', 'URL do webhook para buscar mensagens'),
  ('n8n_webhook_send_message', '', 'URL do webhook para enviar mensagens')
ON CONFLICT (key) DO NOTHING;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

