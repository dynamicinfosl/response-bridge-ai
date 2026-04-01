# 🔐 Configuração do Sistema de Autenticação com Supabase

Este guia vai te ajudar a configurar o sistema de autenticação completo usando Supabase.

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com) (gratuita)
2. Projeto criado no Supabase

## 🚀 Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: `response-bridge-ai` (ou o nome que preferir)
   - **Database Password**: Anote essa senha!
   - **Region**: Escolha a região mais próxima
5. Clique em "Create new project"
6. Aguarde alguns minutos enquanto o projeto é criado

## 🔑 Passo 2: Obter Credenciais da API

1. No dashboard do Supabase, clique em **Settings** (⚙️) no menu lateral
2. Clique em **API** no submenu
3. Você verá duas chaves importantes:
   - **Project URL** (exemplo: `https://xxxxx.supabase.co`)
   - **anon public** key (uma chave longa)

**Copie essas duas informações!** Você vai precisar delas.

## 📝 Passo 3: Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie ou edite o arquivo `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public-aqui
```

2. **Substitua** `https://seu-projeto.supabase.co` pelo seu **Project URL**
3. **Substitua** `sua-chave-anon-public-aqui` pela sua chave **anon public**

## 🗄️ Passo 4: Criar Tabela de Usuários

1. No dashboard do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New Query**
3. Cole o seguinte SQL:

```sql
-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Usuários podem inserir seu próprio perfil (no signup)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Clique em **Run** para executar o SQL
5. Você deve ver a mensagem de sucesso

## 👤 Passo 5: Criar Primeiro Usuário Administrador

### Opção 1: Via Dashboard do Supabase

1. No dashboard do Supabase, clique em **Authentication** no menu lateral
2. Clique em **Users**
3. Clique em **Add User** → **Create New User**
4. Preencha:
   - **Email**: `admin@adaptlink.com` (ou o email que preferir)
   - **Password**: Crie uma senha forte
   - **Auto Confirm User**: ✅ Marque esta opção
   - **User Metadata**:
     ```json
     {
       "full_name": "Administrador",
       "role": "admin"
     }
     ```
5. Clique em **Create User**

### Opção 2: Via SQL (se precisar atualizar role depois)

Se você já criou o usuário, pode atualizar a role para admin:

```sql
-- Atualizar role para admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@adaptlink.com';
```

## 🔒 Passo 6: Configurar Autenticação no Supabase

1. No dashboard do Supabase, clique em **Authentication** → **Settings**
2. Em **Auth Providers**, verifique:
   - ✅ **Email** está habilitado
   - ✅ **Confirm email** pode estar desabilitado para desenvolvimento (ou habilitar depois)
3. Em **Site URL**, adicione:
   - `http://localhost:8080` (para desenvolvimento)
   - Sua URL de produção quando fizer deploy

## ✅ Passo 7: Testar o Sistema

1. **Reinicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:8080/login`

3. Faça login com as credenciais criadas:
   - **Email**: O email que você criou
   - **Senha**: A senha que você definiu

4. Se tudo funcionou, você será redirecionado para o dashboard!

## 🔧 Troubleshooting

### Erro: "Variáveis de ambiente do Supabase não configuradas"

- Verifique se o arquivo `.env.local` existe na raiz do projeto
- Verifique se as variáveis começam com `VITE_`
- Reinicie o servidor após criar/editar o `.env.local`

### Erro: "Invalid API key"

- Verifique se copiou a chave **anon public** corretamente
- Verifique se não há espaços extras na chave

### Erro: "User not found" ao fazer login

- Verifique se o usuário foi criado no Supabase
- Verifique se o email está correto (case-sensitive)
- Verifique se "Auto Confirm User" estava marcado ao criar

### Perfil não está sendo criado

- Verifique se o trigger foi criado corretamente (execute o SQL novamente)
- Verifique os logs do Supabase em **Logs** → **Postgres Logs**

## 📚 Próximos Passos

- [ ] Configurar recuperação de senha
- [ ] Adicionar outros provedores de autenticação (Google, etc.)
- [ ] Implementar roles e permissões avançadas
- [ ] Adicionar upload de avatar
- [ ] Configurar email templates personalizados

## 🆘 Precisa de Ajuda?

Se tiver problemas, verifique:
- [Documentação do Supabase](https://supabase.com/docs)
- Logs do console do navegador (F12)
- Logs do Supabase no dashboard










