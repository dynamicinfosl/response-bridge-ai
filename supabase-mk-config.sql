-- ============================================
-- CONFIGURAÇÃO MK (URL + token) em system_settings
-- ============================================
-- Execute no Supabase: SQL Editor > New Query > Cole > Run
-- ============================================

-- URL base da API MK (substitua se for outra)
INSERT INTO system_settings (key, value, description)
VALUES (
  'mk_base_url',
  'http://186.219.120.50:8080',
  'URL base da API MK Solutions (Adaptlink); sem barra no final'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = TIMEZONE('utc', NOW());

-- Token MK: troque '' pelo seu token se quiser; senão deixe '' e o n8n preenche depois
INSERT INTO system_settings (key, value, description)
VALUES (
  'mk_token',
  '',
  'Token MK (atualizado pelo n8n a cada 48h)'
)
ON CONFLICT (key) DO UPDATE SET
  -- Importante: NÃO zera o token se você rodar o script com value vazio.
  value = CASE
    WHEN EXCLUDED.value IS NOT NULL AND EXCLUDED.value <> '' THEN EXCLUDED.value
    ELSE system_settings.value
  END,
  description = EXCLUDED.description,
  updated_at = TIMEZONE('utc', NOW());
