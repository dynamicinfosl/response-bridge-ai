# 📤 Como Configurar o Envio de Mensagens no n8n

Este guia explica como configurar o n8n para que o operador consiga enviar mensagens via WhatsApp através da interface do chat.

## 🎯 URL do Webhook

```
https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

---

## 📋 Passo 1: Configurar `.env.local`

**Caminho:** `response-bridge-ai/.env.local`

```env
VITE_N8N_API_URL=https://caringvulture-n8n.cloudfy.live/webhook/api-frontend
VITE_N8N_API_KEY=
```

**⚠️ IMPORTANTE:**
- A URL deve terminar em `/webhook/api-frontend` (SEM o `/send-message`)
- O frontend adiciona `/send-message` automaticamente
- Após alterar, **sempre reinicie o servidor** (`Ctrl + C` e `npm run dev`)

---

## 📋 Passo 2: Formato Esperado pelo n8n

### Endpoint:
```
POST https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

### Body (JSON obrigatório):
```json
{
  "chatId": "5521982489052",
  "content": "mensagem digitada",
  "sender": "agent"
}
```

**Campos:**
- `chatId`: Número do cliente vindo do banco (**apenas número, sem @s.whatsapp.net**)
- `content`: Texto digitado pelo operador
- `sender`: Sempre `"agent"`

---

## 📋 Passo 3: Criar Tabela de Mensagens (se ainda não existir)

Execute este SQL no seu PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chatid TEXT NOT NULL,
  content TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' ou 'agent'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_messages_chatid ON messages(chatid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
```

---

## 📋 Passo 4: Criar Workflow no n8n

Crie um novo workflow no n8n chamado "Enviar Mensagem" com os seguintes nodes:

### Node 1: Webhook (POST)

**Nome:** `Receber Mensagem`

**Configurações:**
- **HTTP Method:** `POST`
- **Path:** `/send-message`
- **Response Mode:** `Respond When Last Node Finishes`

**URL completa do webhook:**
```
https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

---

### Node 2: Validar Dados

**Nome:** `Validar Dados`

**Tipo:** `IF` (Conditional)

**Configurações:**
- Verificar se tem `chatId`, `content` e `sender`

**Expressão:**
```javascript
{{ $json.body.chatId && $json.body.content && $json.body.sender }}
```

**Se verdadeiro:** Continua para o próximo node  
**Se falso:** Retorna erro (criar node de resposta de erro)

---

### Node 3: Salvar no Banco de Dados

**Nome:** `Salvar Mensagem no BD`

**Tipo:** `PostgreSQL` → `Execute Query`

**Query SQL:**
```sql
INSERT INTO messages (chatid, content, sender, timestamp, read)
VALUES (
  '{{ $json.body.chatId }}',
  '{{ $json.body.content }}',
  '{{ $json.body.sender }}',
  CURRENT_TIMESTAMP,
  false
)
RETURNING id, chatid, content, sender, timestamp, read;
```

**Mode:** `Execute Query`

---

### Node 4: Atualizar Última Mensagem do Chat

**Nome:** `Atualizar Chat`

**Tipo:** `PostgreSQL` → `Execute Query`

**Query SQL:**
```sql
UPDATE buffer
SET 
  lastmessage = '{{ $json.body.content }}',
  time = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE phone = '{{ $json.body.chatId }}' OR phone LIKE '%{{ $json.body.chatId }}%';
```

**Mode:** `Execute Query`

**Nota:** A query usa `LIKE` para encontrar o chat mesmo se o `phone` no banco tiver `@s.whatsapp.net` e o `chatId` enviado não tiver.

---

### Node 5: Enviar via WhatsApp

**Nome:** `Enviar via WhatsApp`

**Tipo:** `WhatsApp Business API` ou `Venom` (depende da sua configuração)

**Configurações:**
- **To (Para):** `{{ $json.body.chatId }}@s.whatsapp.net` ou `{{ $json.body.chatId }}` (depende da sua API)
- **Message (Mensagem):** `{{ $json.body.content }}`

**Importante:**
- Se você usa WhatsApp Business API oficial, use o node correspondente
- Se você usa Venom/Baileys, configure de acordo com sua instalação
- O formato do número pode variar - verifique qual formato sua API espera

---

### Node 6: Responder Sucesso

**Nome:** `Responder Sucesso`

**Tipo:** `Respond to Webhook`

**Configurações:**
- **Response Code:** `200`
- **Response Data:**
```json
{
  "id": {{ $json.id }},
  "chatId": "{{ $json.chatid }}",
  "content": "{{ $json.content }}",
  "sender": "{{ $json.sender }}",
  "timestamp": "{{ $json.timestamp }}",
  "read": {{ $json.read }}
}
```

**Ou, se preferir formato mais direto:**
```json
{{ $json }}
```

**Nota:** O `$json` aqui se refere ao resultado do node "Salvar Mensagem no BD" (o RETURNING da query).

---

### Node 7: Tratamento de Erro (Opcional)

**Nome:** `Responder Erro`

**Tipo:** `Respond to Webhook`

**Configurações:**
- **Response Code:** `400` ou `500`
- **Response Data:**
```json
{
  "error": true,
  "message": "Erro ao enviar mensagem"
}
```

---

## 📋 Passo 5: Fluxo Completo do Workflow

```
┌─────────────────────┐
│  Webhook (POST)     │  ← Recebe mensagem do frontend
│  /send-message      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validar Dados      │  ← Verifica se tem chatId, content, sender
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Salvar no BD       │  ← Insere na tabela messages
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Atualizar Chat     │  ← Atualiza lastMessage no buffer
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Enviar WhatsApp    │  ← Envia mensagem via WhatsApp
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Responder Sucesso  │  ← Retorna mensagem salva
└─────────────────────┘
```

---

## 🔍 Exemplo de Payload Recebido

O frontend envia este JSON no body da requisição POST:

```json
{
  "chatId": "5521982489052",
  "content": "Olá! Como posso ajudar?",
  "sender": "agent"
}
```

**Nota:** O `chatId` vem sem `@s.whatsapp.net` - o frontend já remove automaticamente.

---

## ✅ Formato de Resposta Esperado

O n8n deve retornar este JSON na resposta:

```json
{
  "id": 123,
  "chatid": "5521982489052",
  "content": "Olá! Como posso ajudar?",
  "sender": "agent",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "read": false
}
```

**Ou se preferir camelCase:**
```json
{
  "id": 123,
  "chatId": "5521982489052",
  "content": "Olá! Como posso ajudar?",
  "sender": "agent",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "read": false
}
```

---

## 🧪 Como Testar

### Opção 1: Testar com PowerShell

```powershell
$url = "https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message"
$body = @{
    chatId = "5521982489052"
    content = "Teste de mensagem"
    sender = "agent"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"
```

### Opção 2: Testar com cURL

```bash
curl -X POST https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "5521982489052",
    "content": "Teste de mensagem",
    "sender": "agent"
  }'
```

### Opção 3: Testar no Frontend

1. Configure o `.env.local` com a URL correta
2. Reinicie o servidor (`npm run dev`)
3. Abra `http://localhost:8080/atendimentos`
4. Selecione uma conversa
5. Digite uma mensagem e clique em enviar
6. Verifique no console do navegador (F12) a requisição enviada

---

## 🚨 Troubleshooting

### Problema 1: Erro 404 Not Found

**Causa:** Workflow não está ativo ou path incorreto

**Solução:**
1. Ative o workflow no n8n (toggle no canto superior direito)
2. Verifique se o path do webhook é exatamente `/send-message`
3. Verifique se a URL no `.env.local` está correta

### Problema 2: Erro 400 Bad Request

**Causa:** Payload incorreto ou campos faltando

**Solução:**
1. Verifique se está enviando `chatId`, `content` e `sender`
2. Verifique se o `chatId` é apenas o número (sem `@s.whatsapp.net`)
3. Verifique se o `sender` é exatamente `"agent"`

### Problema 3: Mensagem não aparece no chat

**Causa:** Resposta do n8n não está no formato esperado

**Solução:**
1. Verifique se o n8n está retornando status 200
2. Verifique se a resposta tem os campos: `id`, `chatId`, `content`, `sender`, `timestamp`
3. Verifique os logs no console do navegador (F12)

### Problema 4: chatId não encontrado no UPDATE

**Causa:** O `phone` no banco pode ter `@s.whatsapp.net` mas o `chatId` enviado não tem

**Solução:**
Use a query SQL com `LIKE` no Node 4:
```sql
WHERE phone = '{{ $json.body.chatId }}' 
   OR phone LIKE '%{{ $json.body.chatId }}%';
```

---

## 📝 Notas Importantes

1. **Formato do chatId:**
   - O frontend envia apenas o número: `5521982489052`
   - O banco pode ter com `@s.whatsapp.net`: `5521982489052@s.whatsapp.net`
   - Use `LIKE` na query SQL para encontrar em ambos os casos

2. **Timestamp:** O frontend espera um timestamp em formato ISO (`2025-11-24T18:00:00.000Z`)

3. **Atualização em tempo real:** Após enviar, o frontend atualiza automaticamente a cada 3 segundos

4. **Teste:** Sempre teste com Postman/cURL antes de testar no frontend

---

## ✅ Checklist de Validação

- [ ] `.env.local` configurado com a URL correta
- [ ] URL termina em `/webhook/api-frontend` (sem `/send-message`)
- [ ] Servidor reiniciado após alterar `.env.local`
- [ ] Workflow está ativo no n8n
- [ ] Webhook configurado como POST em `/send-message`
- [ ] Tabela `messages` criada no PostgreSQL
- [ ] Query SQL de INSERT configurada corretamente
- [ ] Query SQL de UPDATE usa LIKE para encontrar o chat
- [ ] Node de WhatsApp configurado
- [ ] Resposta do n8n retorna JSON com `id`, `chatId`, `content`, `sender`, `timestamp`
- [ ] Teste com Postman/cURL funciona
- [ ] Frontend consegue enviar mensagens

---

## 🎉 Próximos Passos

Depois de configurar tudo:

1. ✅ Teste com Postman/cURL
2. ✅ Teste enviando uma mensagem pelo frontend
3. ✅ Verifique se a mensagem aparece na tela
4. ✅ Verifique se foi salva no banco de dados
5. ✅ Verifique se foi enviada via WhatsApp para o cliente

Se tudo funcionar, o operador já consegue enviar mensagens! 🚀
