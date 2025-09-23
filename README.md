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
- [Uso](#-uso)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API e Integrações](#-api-e-integrações)
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

### Desenvolvimento
- **ESLint** - Linting
- **PostCSS** - Processamento CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn** ou **bun** (gerenciador de pacotes)
- **Git** (para controle de versão)

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

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Configurações da API
VITE_API_URL=http://localhost:3000/api
VITE_API_KEY=sua_chave_api_aqui

# Configurações de IA
VITE_OPENAI_API_KEY=sua_chave_openai
VITE_AI_MODEL=gpt-4

# Configurações de Integração
VITE_WHATSAPP_API_URL=https://api.whatsapp.com
VITE_INSTAGRAM_API_URL=https://graph.facebook.com
VITE_EMAIL_SERVICE_API=sendgrid_api_key

# Configurações de Segurança
VITE_JWT_SECRET=seu_jwt_secret
VITE_ENCRYPTION_KEY=sua_chave_criptografia
```

### Configuração do Tailwind

O projeto já está configurado com Tailwind CSS. As configurações personalizadas estão em `tailwind.config.ts`.

### Configuração do Vite

As configurações do Vite estão em `vite.config.ts` com alias `@` apontando para `./src`.

## 📖 Uso

### Login no Sistema

1. Acesse `http://localhost:8080/login`
2. Use as credenciais padrão:
   - **Email**: `admin@adaptlink.com`
   - **Senha**: `123456`

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
├── lib/                 # Utilitários e configurações
└── assets/              # Imagens e recursos estáticos
```

## 🔌 API e Integrações

### APIs Suportadas

- **WhatsApp Business API** - Integração com WhatsApp
- **Instagram Graph API** - Integração com Instagram
- **SendGrid API** - Envio de emails
- **Twilio API** - Chamadas telefônicas
- **OpenAI API** - Inteligência artificial

### Endpoints Principais

```typescript
// Exemplo de endpoints (implementar no backend)
GET    /api/dashboard/metrics
GET    /api/atendimentos
POST   /api/atendimentos
PUT    /api/atendimentos/:id
GET    /api/relatorios/atendimentos
POST   /api/ai/chat
GET    /api/colaboradores
POST   /api/ordens-servico
```

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

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:

- **Email**: suporte@adaptlink.com
- **Documentação**: [docs.adaptlink.com](https://docs.adaptlink.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/response-bridge-ai/issues)

---

**Desenvolvido com ❤️ pela equipe Adapt Link**