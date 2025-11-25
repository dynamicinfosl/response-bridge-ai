# 📋 Checklist: O que preciso ver no seu n8n

Para configurar os chats corretamente, preciso verificar os seguintes pontos no seu workflow do n8n:

## 🔍 1. Estrutura da Tabela `buffer` no PostgreSQL

Preciso saber quais colunas existem na tabela `buffer`. Execute este SQL no seu PostgreSQL e me envie o resultado:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buffer' 
ORDER BY ordinal_position;
```

**Ou me diga quais colunas você tem:**
- `id` (SERIAL PRIMARY KEY)?
- `phone` (TEXT)?
- `pushname` ou `pushName` (TEXT)?
- `lastmessage` ou `lastMessage` (TEXT)?
- `status` (TEXT)?
- `time` ou `updatedAt` (TIMESTAMP)?
- `unread` (INTEGER)?
- `attendant` (TEXT)?
- Outras colunas?

---

## 🔍 2. Node "Buscar Chats" (SELECT no PostgreSQL)

**Me envie:**
1. A query SQL completa que está no node "Buscar Chats"
2. Um screenshot do node configurado
3. O output de uma execução de teste desse node

**O que o frontend espera receber:**
- Um **array** de objetos, cada um representando um chat
- Cada objeto deve ter pelo menos: `id`, `phone`, `status`
- Campos opcionais mas importantes: `pushName` (ou `pushname`), `lastMessage` (ou `lastmessage`), `time`

**Exemplo de query que deve funcionar:**
```sql
SELECT 
  phone as id,
  phone,
  pushname as "pushName",
  lastmessage as "lastMessage",
  status,
  time,
  unread,
  attendant,
  "createdAt",
  "updatedAt"
FROM buffer
ORDER BY time DESC NULLS LAST, "updatedAt" DESC NULLS LAST;
```

---

## 🔍 3. Node "Rotear Endpoint"

**Me envie:**
1. Como está configurado o roteamento
2. Como ele lê o parâmetro `endpoint` da query string (`?endpoint=chats`)

**O que deve fazer:**
- Ler `$json.query.endpoint` (ou `$input.item.json.query.endpoint`)
- Se `endpoint === "chats"` → vai para o node "Buscar Chats"
- Se `endpoint === "messages"` → vai para o node "Buscar Mensagens"

---

## 🔍 4. Node "Responder Chats"

**Me envie:**
1. Como está configurado
2. O output de uma execução de teste

**O que deve fazer:**
- Receber o resultado do "Buscar Chats" (que é um array de objetos)
- Retornar **todos os itens** usando `$input.all()` ou `$json` (se já for array)
- **NÃO** retornar apenas `$json` (que pega só o primeiro item)

**Configuração correta:**
- Se usar "Respond to Webhook" → Response Data: `{{ $input.all() }}`
- Se usar "Respond to Webhook" → Response Code: `200`
- Se usar "Set" → Values: `{{ $input.all() }}`

---

## 🔍 5. Node "Buscar Mensagens" (para endpoint `messages`)

**Me envie:**
1. A query SQL completa
2. Como ele lê o `chatId` da query string (`?endpoint=messages&chatId=...`)

**O que o frontend espera:**
- Um **array** de mensagens
- Cada mensagem deve ter: `id`, `chatId`, `content`, `sender`, `timestamp`

**Exemplo de query:**
```sql
SELECT 
  id,
  chatid as "chatId",
  content,
  sender,
  timestamp,
  read
FROM messages
WHERE chatid = '{{ $json.query.chatId }}'
ORDER BY timestamp ASC;
```

---

## 🔍 6. Node "Responder Mensagens"

**Me envie:**
1. Como está configurado
2. O output de uma execução de teste

**O que deve fazer:**
- Retornar **todos os itens** usando `$input.all()` ou `$json` (se já for array)
- Garantir que sempre retorna um array, mesmo que vazio: `[]`

---

## 🔍 7. Webhook de Entrada

**Me envie:**
1. A URL completa do webhook
2. Método HTTP (deve ser `GET`)
3. Se está ativo (toggle no canto superior direito do workflow)

**O que deve fazer:**
- Aceitar requisições GET
- Passar `query` parameters para os próximos nodes
- Exemplo: `https://seu-n8n.com/webhook/api-frontend?endpoint=chats`

---

## 🔍 8. Teste Completo

**Execute no navegador ou Postman:**
```
GET https://seu-n8n.com/webhook/api-frontend?endpoint=chats
```

**Me envie:**
1. O JSON completo que retorna
2. Se retorna um array `[...]` ou um objeto `{...}`
3. Um exemplo de um item do array

---

## ✅ Formato Esperado pelo Frontend

### Para `?endpoint=chats`:
```json
[
  {
    "id": "5521982489052@s.whatsapp.net",
    "phone": "5521982489052@s.whatsapp.net",
    "pushName": "João Silva",
    "lastMessage": "Olá, preciso de ajuda",
    "status": "active",
    "time": "2025-11-18T14:30:00Z",
    "unread": 2,
    "attendant": "Atendente 1"
  },
  {
    "id": "5521999999999@s.whatsapp.net",
    "phone": "5521999999999@s.whatsapp.net",
    "pushName": "Maria Santos",
    "lastMessage": "Qual o horário?",
    "status": "waiting",
    "time": "2025-11-18T13:20:00Z",
    "unread": 1
  }
]
```

### Para `?endpoint=messages&chatId=5521982489052@s.whatsapp.net`:
```json
[
  {
    "id": 1,
    "chatId": "5521982489052@s.whatsapp.net",
    "content": "Olá, preciso de ajuda",
    "sender": "user",
    "timestamp": "2025-11-18T14:30:00Z",
    "read": false
  },
  {
    "id": 2,
    "chatId": "5521982489052@s.whatsapp.net",
    "content": "Olá! Como posso ajudar?",
    "sender": "agent",
    "timestamp": "2025-11-18T14:31:00Z",
    "read": true
  }
]
```

---

## 🚨 Problemas Comuns

1. **Retorna objeto ao invés de array:**
   - ❌ `{ id: "...", phone: "..." }`
   - ✅ `[{ id: "...", phone: "..." }]`
   - **Solução:** Use `$input.all()` no node "Responder"

2. **Retorna apenas o primeiro chat:**
   - ❌ Usando `$json` (pega só o primeiro)
   - ✅ Use `$input.all()` para pegar todos

3. **Campos com nomes diferentes:**
   - ❌ `pushname` (minúsculo)
   - ✅ O frontend aceita ambos, mas prefere `pushName` (camelCase)

4. **Query string não está sendo lida:**
   - Verifique se o webhook está passando `query` para os próximos nodes
   - Use `$json.query.endpoint` para ler o parâmetro

---

## 📸 O que me enviar:

1. ✅ Estrutura da tabela `buffer` (SQL ou lista de colunas)
2. ✅ Query SQL do node "Buscar Chats"
3. ✅ Configuração do node "Responder Chats"
4. ✅ Output de teste do endpoint `?endpoint=chats`
5. ✅ URL do webhook e se está ativo

Com essas informações, consigo te ajudar a configurar tudo certinho! 🚀

