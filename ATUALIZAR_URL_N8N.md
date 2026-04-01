# 🔄 Atualizar URL do n8n

## ✅ Nova URL do Webhook

```
https://caringvulture-n8n.cloudfy.live/webhook/8fccbc38-52fd-4813-a6b5-a2f0e14e4264/webhook
```

---

## 📝 Passo 1: Atualizar `.env.local`

Crie ou edite o arquivo `.env.local` na raiz do projeto (`response-bridge-ai/.env.local`):

```env
VITE_N8N_API_URL=https://caringvulture-n8n.cloudfy.live/webhook/8fccbc38-52fd-4813-a6b5-a2f0e14e4264/webhook
VITE_N8N_API_KEY=
```

**Nota:** Se o n8n não precisar de autenticação, deixe `VITE_N8N_API_KEY` vazio.

---

## 🔒 CORS e desenvolvimento local

Se no console aparecer **"blocked by CORS policy: No 'Access-Control-Allow-Origin' header"** ao acessar a página de Atendimentos em `http://localhost:8080`, o n8n não está liberando requisições da sua origem.

**Em desenvolvimento** isso é contornado automaticamente: o Vite faz **proxy** das chamadas. O front chama ` /api/n8n?endpoint=chats` (mesma origem) e o servidor de dev encaminha para a `VITE_N8N_API_URL`. Nada é preciso configurar além do `.env.local` com `VITE_N8N_API_URL` e `VITE_N8N_API_KEY` (se precisar). Reinicie o servidor de dev (`npm run dev` ou `bun run dev`) após alterar o `.env.local`.

**Em produção** o front e o n8n precisam estar na mesma origem, ou o servidor do n8n (ou o proxy na frente dele) precisa enviar `Access-Control-Allow-Origin` com a origem do front (por exemplo `https://seu-dominio.com`).

---

## ⚠️ Problema Identificado

O webhook está retornando apenas:
```json
{"message":"Webhook call received"}
```

Isso significa que o workflow **não está processando** o parâmetro `endpoint=chats` ou **não está retornando** os dados dos chats.

---

## 🔍 O que verificar no n8n

### 1. O Webhook está configurado para receber query parameters?

No node de **Webhook**, verifique:
- ✅ Está configurado como **GET**?
- ✅ Está passando os `query` parameters para os próximos nodes?

### 2. Existe um node para rotear o endpoint?

Você precisa de um node que:
- Lê `$json.query.endpoint` (ou `$input.item.json.query.endpoint`)
- Se `endpoint === "chats"` → vai para "Buscar Chats"
- Se `endpoint === "messages"` → vai para "Buscar Mensagens"

**Exemplo de IF node:**
```
IF $json.query.endpoint === "chats"
  → Buscar Chats (PostgreSQL)
    → Responder Chats
ELSE IF $json.query.endpoint === "messages"
  → Buscar Mensagens (PostgreSQL)
    → Responder Mensagens
```

### 3. O node "Buscar Chats" está configurado?

Deve ter uma query SQL que busca da tabela `buffer`:
```sql
SELECT 
  phone as id,
  phone,
  pushname as "pushName",
  lastmessage as "lastMessage",
  status,
  time,
  unread,
  attendant
FROM buffer
ORDER BY time DESC NULLS LAST, "updatedAt" DESC NULLS LAST;
```

### 4. O node "Responder Chats" está retornando os dados?

Deve retornar `$input.all()` ou `$json` (se for array):
- ✅ **Correto:** `{{ $input.all() }}`
- ❌ **Errado:** `{{ $json }}` (pega só o primeiro item)

---

## 🧪 Teste no n8n

1. **Execute o workflow manualmente** com o parâmetro `endpoint=chats`
2. **Verifique o output** de cada node:
   - Webhook recebeu `query.endpoint = "chats"`?
   - IF node roteou corretamente?
   - Buscar Chats retornou dados?
   - Responder Chats retornou o array completo?

---

## 📋 Estrutura do Workflow Sugerida

```
Webhook (GET)
  ↓
IF ($json.query.endpoint === "chats")
  ↓
Buscar Chats (PostgreSQL)
  ↓
Responder Chats (Respond to Webhook)
  → Response Data: {{ $input.all() }}
  → Response Code: 200
```

---

## 🚀 Após corrigir no n8n

1. ✅ Atualize o `.env.local` com a nova URL
2. ✅ Reinicie o servidor (`Ctrl + C` e `npm run dev`)
3. ✅ Teste em `http://localhost:8080/teste-n8n`
4. ✅ Verifique se os chats aparecem

---

## 💡 Dica

O webhook está funcionando (retorna 200), mas precisa processar os parâmetros e retornar os dados corretos.

Me envie:
1. ✅ Screenshot do workflow
2. ✅ Output do node "Buscar Chats" quando executa
3. ✅ Como está configurado o node "Responder Chats"

Com isso, consigo te ajudar a ajustar! 🚀

