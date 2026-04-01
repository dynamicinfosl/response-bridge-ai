# 🐛 Debug do Sistema de Login

## 🔍 Verificações Necessárias

### 1. Verificar se o Supabase está configurado

Abra o console do navegador (F12) e procure por:

```
✅ Supabase configurado: https://erydxufihxdyhzklpjza.supabase.co
```

Se aparecer erro, as variáveis de ambiente não estão configuradas corretamente.

### 2. Verificar se a tabela `users` foi criada

1. Acesse: https://supabase.com/dashboard/project/erydxufihxdyhzklpjza
2. Clique em **Table Editor** no menu lateral
3. Procure pela tabela `users`

**Se a tabela NÃO existe:**
- Execute o arquivo `supabase-setup.sql` no SQL Editor do Supabase

### 3. Verificar se o usuário foi criado

1. No dashboard do Supabase, clique em **Authentication** → **Users**
2. Verifique se existe um usuário com o email que você está tentando usar

**Se o usuário NÃO existe, crie um:**

1. Clique em **Add User** → **Create New User**
2. Preencha:
   - **Email**: `admin@adaptlink.com` (ou o email que você quer usar)
   - **Password**: Crie uma senha forte (anote ela!)
   - ✅ **Auto Confirm User**: MARQUE ESTA OPÇÃO (IMPORTANTE!)
   - **User Metadata** (JSON):
     ```json
     {
       "full_name": "Administrador",
       "role": "admin"
     }
     ```
3. Clique em **Create User**

### 4. Testar o login com logs

Agora o sistema tem logs detalhados. Faça o seguinte:

1. Abra o console do navegador (F12)
2. Tente fazer login
3. Observe os logs que aparecem:

**Logs esperados:**
```
🔐 Tentando fazer login...
📡 Chamando signIn...
🔑 Supabase signIn iniciado...
📨 Resposta do Supabase: ...
```

**Se aparecer erro:**
- Copie a mensagem de erro completa
- Veja qual etapa falhou

### 5. Erros comuns e soluções

#### Erro: "Invalid login credentials"
- **Causa**: Email ou senha incorretos
- **Solução**: Verifique se o email e senha estão corretos

#### Erro: "Email not confirmed"
- **Causa**: O usuário foi criado mas não foi confirmado
- **Solução**: Ao criar o usuário, MARQUE "Auto Confirm User"

#### Erro: "relation 'users' does not exist"
- **Causa**: A tabela `users` não foi criada
- **Solução**: Execute o SQL em `supabase-setup.sql`

#### Erro: "Variáveis de ambiente não configuradas"
- **Causa**: `.env.local` não está configurado
- **Solução**: Verifique se o arquivo `.env.local` existe e tem as credenciais

#### Login funciona mas volta para a página de login
- **Causa**: Problema no `updateUser` ou na sessão
- **Solução**: Verifique os logs no console para ver onde está falhando

### 6. Limpar cache e tentar novamente

Se nada funcionar:

1. Limpe o localStorage:
   - Console → Application → Local Storage → Clear
2. Limpe o cache do navegador:
   - Ctrl + Shift + Delete → Limpar cache
3. Reinicie o servidor:
   ```bash
   npm run dev
   ```

### 7. Verificar logs do Supabase

1. No dashboard do Supabase
2. Clique em **Logs** → **Postgres Logs**
3. Veja se há erros relacionados ao login

---

## 📋 Checklist

- [ ] Console mostra "✅ Supabase configurado"
- [ ] Tabela `users` existe no Supabase
- [ ] Usuário foi criado no Authentication → Users
- [ ] "Auto Confirm User" estava marcado ao criar
- [ ] Email e senha estão corretos
- [ ] Console mostra logs detalhados ao tentar login
- [ ] Não há erros no console do navegador

---

## 🆘 Se ainda não funcionar

1. **Me mostre os logs do console** quando você tenta fazer login
2. **Verifique se o usuário existe** no Supabase (Authentication → Users)
3. **Verifique se a tabela existe** (Table Editor → users)

Essas informações vão me ajudar a identificar o problema!










