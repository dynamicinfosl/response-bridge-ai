# ⚙️ Configurar URLs do n8n no Banco de Dados

Este guia explica como configurar as URLs do n8n através da interface do sistema, que são salvas no banco de dados ao invés do arquivo `.env.local`.

## 🎯 Vantagens

- ✅ **Configuração via interface**: Não precisa editar arquivos manualmente
- ✅ **Persistência no banco**: Configurações não se perdem ao fazer deploy
- ✅ **Múltiplos ambientes**: Cada ambiente pode ter suas próprias configurações
- ✅ **Fallback seguro**: Se não houver no banco, usa o `.env.local`

## 📋 Passo 1: Criar Tabela no Supabase

1. Acesse o **SQL Editor** no Supabase
2. Abra o arquivo `supabase-system-settings.sql` que está na raiz do projeto
3. Cole o conteúdo no SQL Editor
4. Clique em **Run** para executar

Isso criará a tabela `system_settings` com as configurações do n8n.

## 🔧 Passo 2: Configurar URLs no Sistema

1. Faça login no sistema
2. Acesse **Configurações > Configurações Avançadas**
3. Role até a seção **"Configurações do n8n"**
4. Preencha:
   - **URL Base do n8n**: Ex: `https://seu-n8n.com/webhook/api-frontend`
   - **API Key do n8n** (opcional): Deixe vazio se não precisar
5. Clique em **"Salvar Configurações do n8n"**

## 📍 Onde as URLs são usadas?

O sistema usa essas URLs para:

- **Buscar chats**: `{URL}?endpoint=chats`
- **Buscar mensagens**: `{URL}?endpoint=messages&chatId={chatId}`
- **Enviar mensagens**: `{URL}/send-message`

## 🔄 Como funciona a prioridade?

O sistema busca as URLs nesta ordem:

1. **Cache em memória** (últimas 5 minutos)
2. **Cache no localStorage** (últimas 5 minutos)
3. **Banco de dados** (Supabase)
4. **Fallback para `.env.local`**

## 🚀 Atualizar URLs (Trocar VPS)

Quando você precisar trocar a VPS do n8n:

1. Acesse **Configurações > Configurações Avançadas**
2. Atualize a **URL Base do n8n**
3. Clique em **Salvar**
4. As próximas requisições já usarão a nova URL (cache atualizado automaticamente)

## ⚠️ Importante

- A URL deve terminar em `/webhook/api-frontend` (SEM `/send-message`)
- O sistema adiciona `/send-message` automaticamente quando necessário
- Se você deixar a URL vazia no banco, o sistema usará o `.env.local` como fallback
- O cache é atualizado automaticamente a cada 5 minutos ou quando você salva novas configurações

## 🔍 Verificar Configurações

Para verificar se as configurações estão corretas:

1. Abra o console do navegador (F12)
2. Procure por logs que começam com `🚀 Chamando API:`
3. Verifique se a URL está correta
4. Se houver erro, verifique se o n8n está acessível e os workflows estão ativos

## 🐛 Troubleshooting

### Erro 403 (Forbidden) ao Salvar

Se você receber erro 403 ao tentar salvar as configurações, o problema é que seu usuário não tem role `'admin'`.

**Solução:**

1. **Verificar o role atual:**
   - Abra o console do navegador (F12)
   - Procure por `Dados do usuário (auth nativo):`
   - Verifique o campo `role` - se for `'user'`, precisa atualizar

2. **Atualizar role para admin:**
   
   **Via SQL (Recomendado):**
   - Acesse o SQL Editor no Supabase
   - Execute o script `fix-user-role-to-admin.sql`
   - Ou execute diretamente:
     ```sql
     UPDATE users
     SET role = 'admin'
     WHERE email = 'admin@adaptlink.com';
     ```
   
   **Via Table Editor:**
   - Acesse Table Editor > users
   - Encontre seu usuário
   - Edite o campo `role` para `admin`
   - Salve

3. **Após atualizar:**
   - Faça logout e login novamente
   - Tente salvar as configurações novamente

### Configurações não estão sendo aplicadas

- Verifique se a tabela `system_settings` foi criada no Supabase
- Verifique se você tem permissão de admin (apenas admins podem salvar)
- Limpe o cache do navegador (localStorage)
- Verifique o console para erros

### Erro ao salvar (outros erros)

- Verifique se você está logado como administrador
- Verifique se o Supabase está conectado corretamente
- Verifique os logs no console do navegador
- Execute o script `supabase-fix-system-settings.sql` se ainda não executou

### Sistema continua usando `.env.local`

- Verifique se você salvou as configurações no banco
- Verifique se a URL no banco não está vazia
- Limpe o cache (localStorage) e recarregue a página

