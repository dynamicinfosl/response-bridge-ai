# 🔧 Solução para Erro 403 ao Salvar Configurações

Se você está recebendo erro 403 ao tentar salvar as configurações do n8n, siga estes passos na ordem:

## 📋 Checklist de Solução

### Passo 1: Verificar se o usuário é admin

1. Abra o console do navegador (F12)
2. Procure por: `Dados do usuário (auth nativo):`
3. Verifique o campo `role`:
   - ✅ Se for `'admin'` → Vá para Passo 2
   - ❌ Se for `'user'` → Execute o Passo 1.1 primeiro

#### 1.1 Atualizar role para admin

**Via SQL (Recomendado):**

1. Acesse o SQL Editor no Supabase
2. Execute o script `fix-user-role-to-admin.sql`
3. Ou execute diretamente:
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = 'admin@adaptlink.com';
   ```

**Via Table Editor:**

1. Acesse **Table Editor** > **users**
2. Encontre seu usuário (admin@adaptlink.com)
3. Edite o campo `role` para `admin`
4. Salve

**Após atualizar:**
- Faça logout e login novamente no sistema

---

### Passo 2: Executar correção completa das políticas RLS

1. Acesse o SQL Editor no Supabase
2. Abra o arquivo `supabase-fix-system-settings-v2.sql`
3. Cole todo o conteúdo no editor
4. Execute (Run)

Este script vai:
- ✅ Remover políticas antigas problemáticas
- ✅ Criar função `is_admin()` correta
- ✅ Criar políticas RLS corretas
- ✅ Testar se tudo foi criado

---

### Passo 3: Testar (Opcional)

Se quiser verificar se tudo está funcionando:

1. Execute o script `test-system-settings-rls.sql`
2. Verifique os resultados:
   - Deve mostrar políticas criadas
   - Deve mostrar função criada
   - `is_current_user_admin` deve retornar `true` se você for admin

---

### Passo 4: Tentar salvar novamente

1. No sistema, acesse **Configurações > Configurações Avançadas**
2. Preencha as URLs do n8n
3. Clique em **Salvar Configurações do n8n**
4. Deve funcionar agora! ✅

---

## 🐛 Se ainda não funcionar

### Diagnóstico Avançado

Execute este SQL para verificar tudo:

```sql
-- Verificar usuário atual
SELECT 
  auth.uid() as current_user_id,
  u.email,
  u.role,
  public.is_admin() as is_admin_function_result
FROM users u
WHERE u.id = auth.uid();

-- Verificar políticas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'system_settings';

-- Testar função diretamente
SELECT public.is_admin();
```

### Problemas comuns:

1. **Função is_admin() retorna false:**
   - Verifique se o usuário tem `role = 'admin'` na tabela users
   - Execute novamente o `fix-user-role-to-admin.sql`

2. **Política não existe:**
   - Execute novamente o `supabase-fix-system-settings-v2.sql`

3. **Ainda recebe 403:**
   - Verifique se fez logout/login após atualizar o role
   - Limpe o cache do navegador (localStorage)
   - Verifique se está usando o email correto no UPDATE

---

## ✅ Resultado Esperado

Após seguir todos os passos:
- ✅ Usuário tem `role = 'admin'` na tabela users
- ✅ Função `is_admin()` existe e retorna `true`
- ✅ Políticas RLS estão configuradas corretamente
- ✅ É possível salvar configurações sem erro 403



