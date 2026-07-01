-- Criar tabela para armazenar identidades de clientes vinculadas por telefone
CREATE TABLE IF NOT EXISTS client_identities (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  cpf TEXT,
  cd_cliente TEXT,
  nome_mk TEXT NOT NULL,
  source TEXT DEFAULT 'cpf_auto', -- 'cpf_auto', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_client_identities_phone ON client_identities(phone_number);

-- Índice para busca por CPF
CREATE INDEX IF NOT EXISTS idx_client_identities_cpf ON client_identities(cpf);

-- Habilitar RLS
ALTER TABLE client_identities ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todas as identidades
CREATE POLICY "Authenticated users can view client identities"
  ON client_identities
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários autenticados podem inserir identidades
CREATE POLICY "Authenticated users can insert client identities"
  ON client_identities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar identidades
CREATE POLICY "Authenticated users can update client identities"
  ON client_identities
  FOR UPDATE
  TO authenticated
  USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_client_identities_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_client_identities_updated_at ON client_identities;
CREATE TRIGGER update_client_identities_updated_at
  BEFORE UPDATE ON client_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_identities_updated_at();
