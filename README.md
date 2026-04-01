# 🤖 Response Bridge AI - Sistema de Atendimento Multicanal com IA

Sistema completo de atendimento ao cliente multicanal com inteligência artificial, desenvolvido para empresas que precisam gerenciar atendimentos de forma eficiente através de diferentes canais de comunicação.

![Adapt Link SaaS](https://img.shields.io/badge/Adapt%20Link-SaaS-blue)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-blue)

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
  - [Configuração do n8n](#configuração-do-n8n)
  - [Estrutura de Mensagens](#estrutura-de-mensagens)
- [Uso](#-uso)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API e Integrações](#-api-e-integrações)
- [Troubleshooting](#-troubleshooting)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## 🎯 Visão Geral

O **Response Bridge AI** é uma plataforma SaaS completa que integra inteligência artificial com atendimento multicanal, permitindo que empresas gerenciem conversas de clientes através de WhatsApp, Instagram, E-mail e Telefone de forma unificada e automatizada.

### Principais Benefícios

- 🚀 **Atendimento 24/7** com IA
- 📊 **Dashboard completo** com métricas em tempo real
- 🔄 **Integração multicanal** (WhatsApp, Instagram, E-mail, Telefone)
- 📈 **Relatórios avançados** e analytics
- 👥 **Gestão de colaboradores** e equipes
- ⚙️ **Configurações personalizáveis** por canal
- 🛠️ **Gestão de ordens de serviço**
- 📎 **Suporte a documentos** (PDFs e arquivos)

## ✨ Funcionalidades

### 🏠 Dashboard
- **Visão geral** de métricas importantes
- **Distribuição por canal** com gráficos interativos
- **Conversas recentes** em tempo real
- **Estatísticas de performance** da IA vs atendimento humano
- **Tempo médio de resposta** e taxa de resolução

### 💬 Atendimentos
- **Gestão unificada** de conversas multicanal
- **Chat em tempo real** com clientes
- **Transferência inteligente** entre IA e humanos
- **Histórico completo** de conversas
- **Status de atendimento** (Pendente, Em andamento, Concluído)
- **Suporte a mensagens de texto e documentos** (PDFs, imagens, etc.)

### 📞 Ligações IA
- **Chamadas automatizadas** com IA
- **Configuração de horários** de atendimento
- **Scripts personalizáveis** por tipo de chamada
- **Análise de sentimento** em tempo real
- **Transferência automática** para humanos quando necessário

### 🛠️ Ordens de Serviço
- **Criação e gestão** de ordens de serviço
- **Acompanhamento de status** em tempo real
- **Atribuição automática** de técnicos
- **Notificações** de mudanças de status
- **Relatórios de performance** dos serviços

### 👥 Colaboradores
- **Gestão de equipe** e permissões
- **Métricas de performance** individual
- **Horários de trabalho** e escalas
- **Treinamento** e capacitação
- **Feedback** e avaliações

### 📊 Relatórios
- **Relatórios de atendimentos** por canal
- **Análise de performance** da IA
- **Relatórios financeiros** e de custos
- **Métricas de satisfação** do cliente
- **Exportação** em múltiplos formatos

### ⚙️ Configurações
- **Configuração da IA** por canal
- **Personalização de respostas** automáticas
- **Horários de funcionamento** por canal
- **Integrações** com APIs externas
- **Configurações de segurança** e privacidade

## 🛠️ Tecnologias

### Frontend
- **React 18.3.1** - Biblioteca principal
- **TypeScript 5.8.3** - Tipagem estática
- **Vite 5.4.19** - Build tool e dev server
- **Tailwind CSS 3.4.17** - Framework CSS
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones
- **React Router DOM** - Roteamento
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### Componentes UI
- **Shadcn/ui** - Sistema de componentes
- **Class Variance Authority** - Variantes de componentes
- **Tailwind Merge** - Merge de classes CSS
- **Sonner** - Notificações toast

### Backend/Integração
- **n8n** - Automação de workflows e integração principal
- **PostgreSQL** - Banco de dados
- **WhatsApp Business API** - Integração com WhatsApp (via n8n)

### Desenvolvimento
- **ESLint** - Linting
- **PostCSS** - Processamento CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn** ou **bun** (gerenciador de pacotes)
- **Git** (para controle de versão)
- **n8n** configurado e rodando (para integração)
- **PostgreSQL** (banco de dados)

## 🚀 Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/response-bridge-ai.git
   cd response-bridge-ai
   ```

2. **Instale as dependências**
   ```bash
   npm install
   # ou
   yarn install
   # ou
   bun install
   ```

3. **Execute o projeto em modo desenvolvimento**
   ```bash
   npm run dev
   # ou
   yarn dev
   # ou
   bun dev
   ```

4. **Acesse o sistema**
   ```
   http://localhost:8080
   ```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (`response-bridge-ai/.env.local`):

```env
# ⚠️ OBRIGATÓRIO: Configurações do n8n
VITE_N8N_API_URL=https://seu-n8n.com/webhook/api-frontend
VITE_N8N_API_KEY=sua_api_key_aqui_ou_deixe_vazio

# Configurações do Supabase (opcional)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Configurações de IA (opcional)
VITE_OPENAI_API_KEY=sua_chave_openai
VITE_AI_MODEL=gpt-4
```

**⚠️ IMPORTANTE sobre `VITE_N8N_API_URL`:**
- A URL deve terminar em `/webhook/api-frontend` (SEM endpoints adicionais como `/send-message`)
- O frontend adiciona automaticamente `/send-message` quando necessário
- Após alterar, **sempre reinicie o servidor** (`Ctrl + C` e `npm run dev`)

### Configuração do n8n

O sistema depende do **n8n** para processar workflows e integrar com o WhatsApp. Todas as requisições do frontend são feitas através de webhooks do n8n.

#### 🔗 Webhooks e Endpoints

O frontend se comunica com o n8n através de webhooks. Todos os endpoints seguem o padrão:

**URL Base:** `{VITE_N8N_API_URL}` (ex: `https://seu-n8n.com/webhook/api-frontend`)

##### Endpoints Disponíveis:

1. **GET `?endpoint=chats`**
   - Busca lista de chats/conversas
   - **Query Parameters:**
     - `endpoint=chats` (obrigatório)
     - `t={timestamp}` (opcional, para evitar cache)
   - **Resposta:** Array de objetos `Chat`
   - **Exemplo:** `https://seu-n8n.com/webhook/api-frontend?endpoint=chats&t=1234567890`

2. **GET `?endpoint=messages&chatId={chatId}`**
   - Busca mensagens de um chat específico
   - **Query Parameters:**
     - `endpoint=messages` (obrigatório)
     - `chatId={chatId}` (obrigatório, número do telefone sem @s.whatsapp.net)
     - `t={timestamp}` (opcional, para evitar cache)
   - **Resposta:** Array de objetos `Message`
   - **Exemplo:** `https://seu-n8n.com/webhook/api-frontend?endpoint=messages&chatId=5521982489052&t=1234567890`

3. **POST `/send-message`**
   - Envia uma mensagem de texto
   - **Body (JSON):**
     ```json
     {
       "chatId": "5521982489052",
       "content": "mensagem digitada",
       "sender": "agent"
     }
     ```
   - **Resposta:** Objeto `Message` criado
   - **Exemplo:** `https://seu-n8n.com/webhook/api-frontend/send-message`

#### 📍 Configuração dos Workflows no n8n

Você precisa configurar workflows no n8n para processar essas requisições:

**1. Workflow "API Frontend" (ou similar)**
```
Webhook Node (GET)
  → IF Node (Roteamento)
    → Se endpoint === "chats"
      → PostgreSQL (Buscar Chats)
        → Respond to Webhook
    → Se endpoint === "messages"
      → PostgreSQL (Buscar Mensagens)
        → Respond to Webhook
```

**Configurações:**
- **Webhook Node:** Path `/api-frontend`, Method `GET`
- **IF Node:** Roteia baseado em `$json.query.endpoint`
- **Respond to Webhook:** Retorna dados do PostgreSQL com headers CORS

**2. Workflow "Enviar Mensagem" (ou similar)**
```
Webhook Node (POST)
  → Validar Dados (IF)
  → PostgreSQL (Salvar Mensagem)
  → Enviar via WhatsApp
  → Respond to Webhook
```

**Configurações:**
- **Webhook Node:** Path `/send-message`, Method `POST`
- **Body esperado:** `{ chatId, content, sender }`
- **Respond to Webhook:** Retorna mensagem criada

#### 🔄 Como Trocar a VPS do n8n

Quando você precisar trocar a VPS do n8n, você tem duas opções:

##### Opção 1: Via Interface (Recomendado)

1. **Acesse Configurações > Configurações Avançadas**
2. **Role até a seção "Configurações do n8n"**
3. **Atualize a URL Base do n8n** com a nova URL
4. **Clique em "Salvar Configurações do n8n"**

As configurações são salvas no banco de dados e aplicadas imediatamente.

##### Opção 2: Via `.env.local` (Fallback)

1. **Atualizar `.env.local`**
   ```env
   VITE_N8N_API_URL=https://novo-n8n.com/webhook/api-frontend
   VITE_N8N_API_KEY=sua_api_key_se_necessario
   ```

2. **Reiniciar o servidor**
   ```bash
   # Parar o servidor (Ctrl + C)
   npm run dev
   ```

**Nota:** As configurações do banco de dados têm prioridade sobre o `.env.local`. Se você quiser usar o `.env.local`, deixe a URL vazia no banco de dados.

3. **Verificar workflows no n8n**
   - ✅ Workflows estão ativos (toggle no canto superior direito)
   - ✅ Paths dos webhooks estão corretos (`/api-frontend` e `/send-message`)
   - ✅ Headers CORS configurados (se necessário)
   - ✅ PostgreSQL conectado

4. **Testar conexão**
   - Acesse: `http://localhost:8080/teste-n8n`
   - Clique em "Testar Conexão com n8n"
   - Verifique se retorna status 200

#### 🔑 Configuração de API Key (Opcional)

Se o n8n requer autenticação:

1. **No n8n:**
   - Settings (⚙️) → API → Create API Key
   - Ou Settings → Personal → API Tokens → Create Token

2. **No `.env.local`:**
   ```env
   VITE_N8N_API_KEY=sua_api_key_aqui
   ```

3. **Se não precisar de autenticação:**
   ```env
   VITE_N8N_API_KEY=
   ```
   (deixe vazio ou remova a linha)

### Estrutura de Mensagens

O sistema suporta dois tipos de mensagens:

#### 📝 Mensagem de Texto (`type: "text"`)

```typescript
{
  id: string;
  chatId: string;
  sender: 'user' | 'agent';
  type: 'text';
  content: string;  // obrigatório
  timestamp: string;
  read: boolean;
}
```

#### 📎 Mensagem de Documento (`type: "document"`)

```typescript
{
  id: string;
  chatId: string;
  sender: 'user' | 'agent';
  type: 'document';
  content?: string;  // opcional (pode ser vazio)
  media: {
    url: string;     // URL do arquivo
    name: string;    // Nome do arquivo (ex: "documento.pdf")
  };
  timestamp: string;
  read: boolean;
}
```

**Características:**
- Mensagens do tipo `document` são renderizadas com card visual diferenciado
- Ícone de documento (PDF) em destaque
- Link para download/abrir o documento
- O campo `content` é opcional e não é renderizado para documentos

**Detecção automática:**
- Se uma mensagem tem `media.url` e `media.name`, é automaticamente detectada como tipo `document`
- Não é necessário especificar `type` explicitamente se houver `media`

### Configuração do Tailwind

O projeto já está configurado com Tailwind CSS. As configurações personalizadas estão em `tailwind.config.ts`.

### Configuração do Vite

As configurações do Vite estão em `vite.config.ts` com alias `@` apontando para `./src`.

## 📖 Uso

### Login no Sistema

1. Acesse `http://localhost:8080/login`
2. Use suas credenciais de cadastro para fazer login
3. Em caso de dificuldades, clique em "Falar com suporte"

### Navegação Principal

- **Dashboard**: Visão geral do sistema
- **Atendimentos**: Gerenciar conversas com clientes
- **Ligações IA**: Configurar e monitorar chamadas automatizadas
- **Ordens de Serviço**: Criar e acompanhar serviços técnicos
- **Colaboradores**: Gerenciar equipe e permissões
- **Relatórios**: Visualizar métricas e exportar dados
- **Configurações**: Personalizar IA e integrações

### Configuração da IA

1. Acesse **Configurações > Configuração IA**
2. Configure os modelos de IA por canal
3. Personalize mensagens de saudação e fallback
4. Defina horários de funcionamento
5. Salve as configurações

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizáveis
│   ├── ui/              # Componentes base (Shadcn/ui)
│   ├── layout/          # Layout principal
│   ├── dashboard/       # Componentes do dashboard
│   └── atendimentos/    # Componentes de atendimento
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx    # Página principal
│   ├── Login.tsx        # Página de login
│   ├── Atendimentos.tsx # Gestão de atendimentos
│   ├── LigacoesIA.tsx   # Ligações com IA
│   ├── OrdemServico.tsx # Ordens de serviço
│   ├── Colaboradores.tsx# Gestão de colaboradores
│   ├── Relatorios.tsx   # Relatórios e analytics
│   └── ConfiguracaoIA.tsx# Configurações da IA
├── hooks/               # Hooks personalizados
│   └── useChats.ts      # Hooks para chats e mensagens
├── lib/                 # Utilitários e configurações
│   ├── api.ts           # Configuração da API (n8n)
│   ├── supabase.ts      # Configuração do Supabase
│   └── utils.ts         # Funções utilitárias
└── assets/              # Imagens e recursos estáticos
```

## 🔌 API e Integrações

### APIs Suportadas

- **n8n** - Automação de workflows e integração principal
- **WhatsApp Business API** - Integração com WhatsApp (via n8n)
- **PostgreSQL** - Banco de dados (via n8n)
- **Supabase** - Autenticação e banco de dados (opcional)
- **OpenAI API** - Inteligência artificial (opcional)

### Endpoints Principais (via n8n)

Todos os endpoints são processados através de webhooks do n8n:

```typescript
// Buscar chats
GET {VITE_N8N_API_URL}?endpoint=chats

// Buscar mensagens
GET {VITE_N8N_API_URL}?endpoint=messages&chatId={chatId}

// Enviar mensagem
POST {VITE_N8N_API_URL}/send-message
Body: {
  chatId: string;
  content: string;
  sender: 'agent';
}
```

Para mais detalhes sobre configuração dos webhooks, veja a seção [Configuração do n8n](#configuração-do-n8n).

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Padrões de Código

- Use **TypeScript** para tipagem
- Siga o padrão **ESLint** configurado
- Use **conventional commits** para mensagens
- Teste suas mudanças antes de submeter

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Build de produção
npm run build:dev    # Build de desenvolvimento

# Qualidade de Código
npm run lint         # Executa ESLint

# Preview
npm run preview      # Preview do build de produção
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de dependências**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Erro de porta em uso**
   - Mude a porta no `vite.config.ts`
   - Ou mate o processo usando a porta 8080

3. **Problemas de CSS**
   - Verifique se o Tailwind está compilando
   - Execute `npm run dev` novamente

4. **Erro de conexão com n8n**
   - ✅ Verifique se `VITE_N8N_API_URL` está correto no `.env.local`
   - ✅ Verifique se a URL termina em `/webhook/api-frontend` (sem `/send-message`)
   - ✅ Verifique se os workflows estão ativos no n8n (toggle no canto superior direito)
   - ✅ Teste a URL do webhook diretamente no navegador ou Postman
   - ✅ Verifique se há erro de CORS (configure headers CORS no node "Respond to Webhook")
   - ✅ Verifique se o n8n está acessível e rodando

5. **Mensagens não aparecem no chat**
   - ✅ Abra o console do navegador (F12) e verifique erros
   - ✅ Verifique se as mensagens estão sendo retornadas da API
   - ✅ Verifique se o formato das mensagens está correto (ver [Estrutura de Mensagens](#estrutura-de-mensagens))
   - ✅ Mensagens do tipo `document` precisam ter `media.url` e `media.name`
   - ✅ Verifique os logs no console para mensagens filtradas

6. **Documentos não aparecem**
   - ✅ Verifique se a mensagem tem `type: "document"` ou `media.url` e `media.name`
   - ✅ Verifique se a URL do documento está acessível (sem erros 404)
   - ✅ Verifique o console para mensagens filtradas (procure por `🚫 Mensagem filtrada`)
   - ✅ Certifique-se de que a URL da media não tem quebras de linha ou espaços extras

7. **Erro 404 no webhook**
   - ✅ Verifique se o workflow está ativo no n8n
   - ✅ Verifique se o path do webhook está correto (`/api-frontend` ou `/send-message`)
   - ✅ Verifique se a URL completa está correta no `.env.local`

8. **Erro de autenticação**
   - ✅ Verifique se `VITE_N8N_API_KEY` está configurado corretamente
   - ✅ Verifique se o n8n realmente precisa de autenticação (pode deixar vazio se não precisar)
   - ✅ Gere uma nova API Key no n8n se necessário

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:

- **Email**: suporte@adaptlink.com
- **Documentação**: [docs.adaptlink.com](https://docs.adaptlink.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/response-bridge-ai/issues)

---

**Desenvolvido com ❤️ pela equipe Adapt Link**