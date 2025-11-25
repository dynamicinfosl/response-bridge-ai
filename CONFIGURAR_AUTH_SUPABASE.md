# Configurar Autenticação Nativa do Supabase

## 1. Configurações de Auth no Supabase

Acesse: https://supabase.com/dashboard/project/erydxufihxdyhzklpjza

### Authentication → Settings:

1. **Email Auth:**
   - ✅ Enable email confirmations: **DESABILITAR** (para não precisar confirmar email)
   - ✅ Enable email change confirmations: **DESABILITAR**
   - ✅ Enable secure email change: **DESABILITAR**

2. **Auth Providers:**
   - ✅ Email: **HABILITADO**
   - ✅ Phone: **OPCIONAL**

3. **Security:**
   - Site URL: `http://localhost:5173` (para desenvolvimento)
   - Redirect URLs: `http://localhost:5173/**`

## 2. Criar Usuário

### Opção A - Via Interface (Recomendado):
1. Vá em **Authentication → Users**
2. Clique em **"Add User"**
3. Preencha:
   - Email: `admin@adaptlink.com`
   - Password: `admin123456`
   - **IMPORTANTE:** Marque **"Auto Confirm User"**
4. Clique em **"Create User"**

### Opção B - Via SQL:
```sql
-- Execute no SQL Editor
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
  raw_user_meta_data
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
  '{"name": "Administrador", "full_name": "Administrador"}'
);
```

## 3. Testar Login

Depois de configurar:
- **Email:** admin@adaptlink.com
- **Senha:** admin123456

## 4. Vantagens da Auth Nativa

- ✅ Não precisa de tabelas customizadas
- ✅ Gerenciamento automático de sessões
- ✅ Segurança built-in
- ✅ Reset de senha automático
- ✅ Confirmação de email (se habilitado)
