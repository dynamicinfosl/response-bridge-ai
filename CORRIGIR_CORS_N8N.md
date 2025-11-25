# 🔧 Como Corrigir CORS no n8n

## ❌ Problema

O frontend está recebendo erro de CORS:
```
Access to fetch at 'https://caringvulture-n8n.cloudfy.live/webhook/api-frontend?endpoint=chats' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## ✅ Solução: Configurar CORS no n8n

### Opção 1: Configurar CORS no Node "Respond to Webhook"

No node **"Respond to Webhook"** (ou "Responder Chats"), adicione os headers CORS:

1. **Abra o node "Respond to Webhook"**
2. **Vá em "Options"** ou "Opções"
3. **Adicione os seguintes headers:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Ou configure assim:**

No campo **"Response Headers"** ou **"Headers"**, adicione:
- **Name:** `Access-Control-Allow-Origin`
- **Value:** `*` (ou `http://localhost:8080` para ser mais específico)

- **Name:** `Access-Control-Allow-Methods`
- **Value:** `GET, POST, OPTIONS`

- **Name:** `Access-Control-Allow-Headers`
- **Value:** `Content-Type, Authorization`

---

### Opção 2: Adicionar Node "Set" antes de Responder

Se o node "Respond to Webhook" não tiver opção de headers, adicione um node **"Set"** antes dele:

1. **Adicione um node "Set"** entre "Buscar Chats" e "Responder Chats"
2. **Configure assim:**

**Keep Only Set Fields:** ✅ (marcado)

**Fields to Set:**
- **Name:** `Access-Control-Allow-Origin`
- **Value:** `*`

- **Name:** `Access-Control-Allow-Methods`
- **Value:** `GET, POST, OPTIONS`

- **Name:** `Access-Control-Allow-Headers`
- **Value:** `Content-Type, Authorization`

3. **Conecte:** Buscar Chats → Set (adicionar headers) → Responder Chats

---

### Opção 3: Configurar CORS no n8n (Configuração Global)

Se você tem acesso às configurações do n8n:

1. **No arquivo de configuração do n8n** (geralmente `.env` ou configuração do servidor)
2. **Adicione:**

```env
N8N_CORS_ORIGIN=http://localhost:8080,https://seudominio.com
```

Ou para permitir todas as origens (apenas para desenvolvimento):
```env
N8N_CORS_ORIGIN=*
```

3. **Reinicie o n8n**

---

## 🔍 Verificar se Funcionou

Após configurar, teste no navegador:

1. Abra o **Console do navegador** (F12)
2. Recarregue a página
3. Verifique se ainda há erros de CORS

Se não houver mais erros de CORS, mas ainda não aparecerem chats, o problema é que o webhook está retornando resposta vazia.

---

## 📋 Checklist

- [ ] Headers CORS adicionados no node "Respond to Webhook"
- [ ] Ou node "Set" adicionado antes de responder
- [ ] Ou CORS configurado globalmente no n8n
- [ ] Workflow salvo e ativo
- [ ] Testado no navegador (sem erros de CORS)

---

## 🚨 Se ainda não funcionar

Me envie:
1. Screenshot do node "Respond to Webhook" configurado
2. Se há opção de "Response Headers" no node
3. Qual método você usou (Opção 1, 2 ou 3)

Com isso, consigo te ajudar melhor! 🚀

