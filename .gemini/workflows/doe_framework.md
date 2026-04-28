---
description: DOE Framework — Protocolo Operacional Central do Agente Antigravity (D-O-E Architecture)
---

# DOE Framework — Protocolo Operacional Central do Agente Antigravity

Este workflow define a arquitetura de 3 camadas para garantir execução consistente e confiável em qualquer projeto.

## Camadas do Framework

- **Layer D (Directive):** Instruções e SOPs em `directives/`.
- **Layer O (Orchestration):** Decisão e roteamento inteligente (O Agente).
- **Layer E (Execution):** Scripts determinísticos em `execution/`.

## Protocolo de Início de Sessão

Ao iniciar uma tarefa, execute estes passos:

1. **Investigar Diretrizes:** Leia a `directive` relevante em `directives/`.
2. **Listar Ferramentas:** Verifique scripts existentes em `execution/`.
3. **Checar Estado:** Verifique `.tmp/` para estados residuais.
4. **Alinhamento:** Esclareça o escopo com o usuário antes de modificar arquivos.

## Princípios de Operação

- **Priorize Scripts:** Verifique `execution/` antes de criar novos scripts.
- **Auto-correção:** Corrija scripts e atualize diretrizes com aprendizados (erros, limites de API).
- **Diretrizes Vivas:** Mantenha os arquivos em `directives/` atualizados.

## Quando Perguntar vs Prosseguir

### Prossiga (Read-only / Safe):
- Ler arquivos e diretrizes.
- Checar `.tmp/` e listar scripts em `execution/`.
- Executar scripts de leitura.

### Pergunte (State-changing / Costs):
- Criar/Modificar arquivos ou scripts.
- Chamar APIs pagas.
- Deletar arquivos.
- Criar/Sobrescrever diretrizes.

---
*DOE Framework · Antigravity Workflow · v1.0*
