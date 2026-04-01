-- Criar tabela para armazenar nomes dos clientes salvos
CREATE TABLE IF NOT EXISTS client_names (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  phone_number TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'pushname', 'extracted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Índice para busca rápida por chat_id
CREATE INDEX IF NOT EXISTS idx_client_names_chat_id ON client_names(chat_id);

-- Índice para busca por phone_number
CREATE INDEX IF NOT EXISTS idx_client_names_phone ON client_names(phone_number);

-- Habilitar RLS
ALTER TABLE client_names ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todos os nomes
CREATE POLICY "Authenticated users can view client names"
  ON client_names
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários autenticados podem inserir nomes
CREATE POLICY "Authenticated users can insert client names"
  ON client_names
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar nomes
CREATE POLICY "Authenticated users can update client names"
  ON client_names
  FOR UPDATE
  TO authenticated
  USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_client_names_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_client_names_updated_at ON client_names;
CREATE TRIGGER update_client_names_updated_at
  BEFORE UPDATE ON client_names
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_names_updated_at();










