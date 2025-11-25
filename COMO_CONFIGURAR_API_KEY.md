# 🔑 Como Configurar a API Key do n8n

## 📋 Passo 1: Verificar se o n8n precisa de autenticação

### No n8n:

1. **Abra o workflow** que contém o webhook `api-frontend`
2. **Clique no node de Webhook** (o primeiro node do workflow)
3. **Procure por "Authentication"** ou "Autenticação" nas configurações
4. **Verifique qual opção está selecionada:**
   - ✅ **"None"** ou **"No Authentication"** → **NÃO precisa de API Key**
   - ❌ **"Header Auth"** ou **"API Key"** → **PRECISA de API Key**

---

## 🔑 Passo 2: Se precisar de API Key, como obter

### Opção A: Usar API Key do n8n (Recomendado)

1. No n8n, vá em **Settings** (⚙️) → **API**
2. Se já tiver uma API Key criada, copie ela
3. Se não tiver, clique em **"Create API Key"** ou **"Criar API Key"**
4. Dê um nome (ex: "Frontend API")
5. Copie a key gerada (ela só aparece uma vez!)

### Opção B: Usar Token de Autenticação do Usuário

1. No n8n, vá em **Settings** (⚙️) → **Personal** → **API Tokens**
2. Clique em **"Create Token"** ou **"Criar Token"**
3. Dê um nome (ex: "Frontend Token")
4. Copie o token gerado

---

## ⚙️ Passo 3: Configurar no Frontend

### 1. Abra o arquivo `.env.local` na raiz do projeto:

```
response-bridge-ai/.env.local
```

### 2. Adicione ou atualize as variáveis:

```env
VITE_N8N_API_URL=https://n8n-n8n.pjp6ko.easypanel.host/webhook/api-frontend
VITE_N8N_API_KEY=sua_api_key_aqui
```

**Exemplo:**
```env
VITE_N8N_API_URL=https://n8n-n8n.pjp6ko.easypanel.host/webhook/api-frontend
VITE_N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlODBkMmNiOS1lOWUxLTQxOTItOGMzMS1iYWRiNjIwMTNhN2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyMTMwNDc4fQ.62cwhuzEnXHZbxAuFXpLcClLUc3mlynsbWEjXLk7VbY
```

### 3. Se o n8n NÃO precisa de autenticação:

Deixe a `VITE_N8N_API_KEY` vazia ou remova a linha:

```env
VITE_N8N_API_URL=https://n8n-n8n.pjp6ko.easypanel.host/webhook/api-frontend
VITE_N8N_API_KEY=
```

---

## 🔄 Passo 4: Reiniciar o servidor

Após alterar o `.env.local`, **sempre reinicie o servidor**:

1. No terminal onde está rodando `npm run dev`, pressione **Ctrl + C**
2. Execute novamente: `npm run dev`

---

## ✅ Passo 5: Testar

1. Acesse: `http://localhost:8080/teste-n8n`
2. Clique em **"Testar Conexão com n8n"**
3. Verifique se retorna os chats ou se dá erro

---

## 🚨 Problemas Comuns

### Erro 401 (Unauthorized)
- **Causa:** API Key incorreta ou ausente
- **Solução:** Verifique se a key está correta no `.env.local` e se reiniciou o servidor

### Erro 404 (Not Found)
- **Causa:** Workflow não está ativo ou URL incorreta
- **Solução:** 
  1. Ative o workflow no n8n (toggle no canto superior direito)
  2. Verifique se a URL do webhook está correta

### Erro "API Key não configurada"
- **Causa:** Arquivo `.env.local` não existe ou está no lugar errado
- **Solução:** 
  1. Crie o arquivo em `response-bridge-ai/.env.local` (não na raiz do projeto)
  2. Reinicie o servidor

---

## 📝 Resumo Rápido

1. ✅ Verifique se o webhook precisa de autenticação no n8n
2. ✅ Se sim, obtenha a API Key em Settings → API
3. ✅ Adicione no `.env.local`: `VITE_N8N_API_KEY=sua_key`
4. ✅ Reinicie o servidor (`Ctrl + C` e `npm run dev`)
5. ✅ Teste em `http://localhost:8080/teste-n8n`

---

## 💡 Dica

Se você não tem certeza se precisa de API Key, **tente primeiro sem ela** (deixe `VITE_N8N_API_KEY=` vazio). Se der erro 401, aí você sabe que precisa configurar a key.

