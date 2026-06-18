-- Adiciona a chave de API de ligações com IA na tabela system_settings.
-- Execute este script no Supabase Dashboard > SQL Editor.
--
-- Substitua 'SUA_CHAVE_AQUI' pela chave real antes de executar.
-- A chave pode ser configurada também diretamente pela interface em
-- Configurações Avançadas > Ligações com IA (somente usuários master).

INSERT INTO system_settings (key, value)
VALUES ('vapi_api_key', 'SUA_CHAVE_AQUI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
