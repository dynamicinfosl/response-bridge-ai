# ✅ Validação da Configuração de Envio de Mensagens

## 🔗 URL do Webhook Fornecida

```
https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

---

## 📋 Configuração Esperada pelo n8n

### Endpoint:
```
POST https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

### Body (JSON):
```json
{
  "chatId": "5521982489052",
  "content": "mensagem digitada",
  "sender": "agent"
}
```

**Campos:**
- `chatId`: Número do cliente vindo do banco (sem `@s.whatsapp.net`)
- `content`: Texto digitado pelo operador
- `sender`: Sempre `"agent"`

---

## ✅ Validação da Configuração do Frontend

### 1. URL Base no `.env.local`

O arquivo `.env.local` deve ter:

```env
VITE_N8N_API_URL=https://caringvulture-n8n.cloudfy.live/webhook/api-frontend
VITE_N8N_API_KEY=
```

**Importante:**
- A URL deve terminar em `/webhook/api-frontend` (SEM o `/send-message` no final)
- O frontend vai adicionar `/send-message` automaticamente
- Se o n8n não precisa de autenticação, deixe `VITE_N8N_API_KEY` vazio

---

### 2. Endpoint Configurado no Código

**Arquivo:** `src/lib/api.ts`

```typescript
send: (data: SendMessagePayload) => {
  // Extrai apenas o número (remove @s.whatsapp.net)
  const cleanChatId = data.chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
  
  // Envia para /send-message
  return fetchAPI<Message>('/send-message', {
    method: 'POST',
    body: JSON.stringify({
      chatId: cleanChatId,  // Apenas número: "5521982489052"
      content: data.content,
      sender: data.sender    // Sempre "agent"
    }),
  });
}
```

**✅ Correto!** O código já foi ajustado para:
- Limpar o `chatId` (remover `@s.whatsapp.net`)
- Enviar para o endpoint `/send-message`
- Enviar apenas o número no `chatId`

---

### 3. Formato do Payload Enviado

Quando o operador envia uma mensagem, o frontend enviará:

**Exemplo:**
```json
{
  "chatId": "5521982489052",
  "content": "Olá! Como posso ajudar?",
  "sender": "agent"
}
```

**URL completa da requisição:**
```
POST https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
Content-Type: application/json

{
  "chatId": "5521982489052",
  "content": "Olá! Como posso ajudar?",
  "sender": "agent"
}
```

---

## 🔍 Verificações Necessárias

### ✅ 1. Verificar `.env.local`

Crie ou edite o arquivo na raiz do projeto:

**Caminho:** `response-bridge-ai/.env.local`

**Conteúdo:**
```env
VITE_N8N_API_URL=https://caringvulture-n8n.cloudfy.live/webhook/api-frontend
VITE_N8N_API_KEY=
```

**⚠️ IMPORTANTE:** Após alterar o `.env.local`, **sempre reinicie o servidor**:
1. Pressione `Ctrl + C` no terminal
2. Execute `npm run dev` novamente

---

### ✅ 2. Verificar Formato do chatId

O `chatId` que vem do banco pode estar em dois formatos:

**Formato 1 (com @s.whatsapp.net):**
```
5521982489052@s.whatsapp.net
```

**Formato 2 (apenas número):**
```
5521982489052
```

**✅ O código já trata isso:** Ele remove o `@s.whatsapp.net` automaticamente antes de enviar.

---

### ✅ 3. Validar Resposta do n8n

O n8n deve retornar o JSON da mensagem salva:

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

**Se o formato for diferente, ajuste conforme necessário.**

---

## 🧪 Como Testar

### Opção 1: Testar no Frontend
1. Abra o chat em `http://localhost:8080/atendimentos`
2. Selecione uma conversa
3. Digite uma mensagem
4. Clique em enviar
5. Verifique no console do navegador (F12) a requisição enviada

### Opção 2: Testar com cURL (PowerShell)

```powershell
$url = "https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message"
$body = @{
    chatId = "5521982489052"
    content = "Teste de mensagem"
    sender = "agent"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"
```

### Opção 3: Testar com Postman

**Método:** POST

**URL:**
```
https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "chatId": "5521982489052",
  "content": "Teste de mensagem",
  "sender": "agent"
}
```

---

## ✅ Checklist de Validação

- [ ] `.env.local` está configurado com a URL correta
- [ ] URL termina em `/webhook/api-frontend` (sem `/send-message`)
- [ ] Servidor foi reiniciado após alterar `.env.local`
- [ ] Teste com cURL/Postman retorna sucesso
- [ ] O n8n recebe o payload correto
- [ ] O n8n salva no PostgreSQL
- [ ] O n8n atualiza o último chat
- [ ] O n8n envia via WhatsApp Cloud API
- [ ] O n8n retorna o JSON da mensagem salva
- [ ] Frontend mostra a mensagem enviada

---

## 🚨 Problemas Comuns e Soluções

### Erro 404: Not Found

**Causa:** URL incorreta ou workflow não está ativo

**Solução:**
1. Verifique se a URL no `.env.local` está correta
2. Verifique se o workflow está ativo no n8n (toggle no canto superior direito)
3. Verifique se o path do webhook é exatamente `/send-message`

---

### Erro 400: Bad Request

**Causa:** Payload incorreto ou campos faltando

**Solução:**
1. Verifique se está enviando `chatId`, `content` e `sender`
2. Verifique se o `chatId` é apenas o número (sem `@s.whatsapp.net`)
3. Verifique se o `sender` é exatamente `"agent"`

---

### Mensagem não aparece no chat

**Causa:** Resposta do n8n não está no formato esperado ou erro silencioso

**Solução:**
1. Abra o console do navegador (F12)
2. Verifique os logs de erro
3. Verifique se o n8n está retornando status 200
4. Verifique se a resposta do n8n tem o formato correto

---

### chatId com formato errado

**Causa:** O banco pode retornar `chatId` com ou sem `@s.whatsapp.net`

**Solução:**
✅ **Já está tratado no código!** O frontend remove automaticamente o `@s.whatsapp.net` antes de enviar.

---

## 📝 Resumo da Configuração

**URL Base (`.env.local`):**
```
VITE_N8N_API_URL=https://caringvulture-n8n.cloudfy.live/webhook/api-frontend
```

**Endpoint Final:**
```
POST https://caringvulture-n8n.cloudfy.live/webhook/api-frontend/send-message
```

**Payload:**
```json
{
  "chatId": "5521982489052",
  "content": "mensagem do operador",
  "sender": "agent"
}
```

**✅ Tudo configurado corretamente!**

---

## 🎯 Próximos Passos

1. ✅ Configure o `.env.local` com a URL correta
2. ✅ Reinicie o servidor (`npm run dev`)
3. ✅ Teste enviando uma mensagem no frontend
4. ✅ Verifique se a mensagem aparece na tela
5. ✅ Verifique se foi enviada via WhatsApp

Se tudo funcionar, o envio de mensagens está configurado! 🚀

