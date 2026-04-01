# Configurar integração MK Solutions (Adaptlink)

A aplicação busca **tudo de uma vez** no Supabase (uma única query). Se faltar algo no banco ou a busca falhar, usa o `.env` como fallback.

- **Supabase:** tabela `system_settings`, chaves `mk_base_url` e `mk_token`.
- **.env:** `VITE_MK_BASE_URL` e `VITE_MK_TOKEN` (usados quando o banco não tem o valor ou demora a responder).

## 1. Banco de dados (Supabase) — recomendado

Use o script **`supabase-mk-config.sql`** na raiz do projeto: no Supabase, SQL Editor > New Query > cole o conteúdo do arquivo > Run. Ele cria/atualiza as linhas `mk_base_url` e `mk_token` na tabela `system_settings`. Opcionalmente edite no script o valor de `mk_token` (ou deixe vazio para o n8n preencher depois).

## 2. Variáveis de ambiente (fallback)

No `.env.local` (raiz do projeto `response-bridge-ai`), para quando o Supabase não tiver o valor ou estiver lento:

```env
VITE_MK_BASE_URL=http://186.219.120.50:8080
VITE_MK_TOKEN=6df7d181328b30e3342f5351447b828c.886698
```

## 3. Onde vão `sys`, `MK0`, `token`?

Esses parâmetros **não ficam no Supabase**. Eles são enviados na **URL de cada requisição** para a API do MK. O código em `src/lib/mk-api.ts` monta a chamada assim:

- **URL base** → vem do Supabase (ou .env): `mk_base_url`, ex.: `http://186.219.120.50:8080`
- Em toda requisição são adicionados na query string:
  - `sys=MK0` (fixo no código; é o sistema MK que a API exige)
  - `token=<valor>` (vem do Supabase ou .env: `mk_token`)
  - mais os parâmetros da chamada (ex.: `nome_cliente=diogo`)

Ou seja: você só configura **URL base** e **token** (Supabase ou .env). O `sys=MK0` já está no código e não precisa configurar em lugar nenhum.

## 4. Desenvolvimento local (CORS)

Em **development**, o Vite faz proxy das chamadas para o MK. É necessário ter **`VITE_MK_BASE_URL`** no `.env.local` para o proxy ser ativado; caso contrário as requisições podem falhar por CORS.

## 5. Se aparecer "Token do MK não configurado" ou "URL do MK não configurada"

- O app tenta **uma única busca** no Supabase (chaves `mk_base_url` e `mk_token`). Se falhar ou vier vazio, usa o `.env`.
- **O que fazer:**
  1. No **Supabase** → Table Editor → `system_settings`: confira se existem linhas com **key** `mk_token` e (opcional) `mk_base_url` com **value** preenchido.
  2. Se preferir não depender do banco, preencha `VITE_MK_BASE_URL` e `VITE_MK_TOKEN` no `.env.local` e reinicie o servidor de dev.

## 6. O que foi implementado

- **Página Clientes MK** (`/clientes`): **busca** por nome e/ou CPF/CNPJ. A API WSMKConsultaClientes exige pelo menos um parâmetro, então a listagem só é feita quando o usuário informa algum filtro.
- **Atendimentos**: botão **"Cliente MK"** no cabeçalho do chat; ao clicar, é possível buscar por CPF/CNPJ ou nome. Ao encontrar o cliente, abre-se um **painel redimensionável e minimizável** com resumo (faturas pendentes, contratos, conexões).
