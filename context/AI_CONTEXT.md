# Contexto para agentes de IA

Esta pasta é a memória documental durável da Elisa. Ela existe para que outro agente ou pessoa retome o projeto sem depender do histórico de conversas.

## Como usar

1. Leia [`AGENTS.md`](../AGENTS.md) e este índice sempre.
2. Consulte apenas os documentos relevantes para a tarefa.
3. Antes de mudanças arquiteturais, leia [`DECISIONS.md`](DECISIONS.md) e os ADRs relacionados.
4. Antes de alterar UI, leia [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
5. Antes de alterar dados, leia [`ARCHITECTURE.md`](ARCHITECTURE.md) e a skill de migração.
6. Inspecione o código e o estado do Git; a documentação pode estar desatualizada.

## Fonte principal por assunto

| Assunto | Fonte |
| --- | --- |
| Visão e escopo | [PROJECT.md](PROJECT.md) |
| Camadas, API, banco, fluxos | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Tokens, componentes, acessibilidade | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| Nomenclatura, validação, datas, testes | [CONVENTIONS.md](CONVENTIONS.md) |
| Estado de implementação | [ROADMAP.md](ROADMAP.md) |
| Decisões duráveis | [DECISIONS.md](DECISIONS.md) e `decisions/` |
| Módulos e pontos de entrada | [MODULES.md](MODULES.md) e `modules/` |
| Diário em Markdown e índice | [modules/diary.md](modules/diary.md) e [ADR-009](decisions/ADR-009-markdown-canonico-indice-sqlite.md) |
| EXP, níveis e extrato | [modules/profile.md](modules/profile.md) e [ADR-013](decisions/ADR-013-exp-ledger.md) |
| Procedimentos repetíveis | `skills/` |
| Delegação e subagentes | [ADR-014](decisions/ADR-014-agentes-especializados-e-delegacao.md) e `.opencode/skills/` |
| Instalação e comandos | [README.md](../README.md) e [AGENTS.md](../AGENTS.md) |

## Como atualizar

- Atualize o documento afetado na mesma entrega da mudança de código.
- Mudança de comportamento de módulo → `modules/<nome>.md` e `ROADMAP.md`.
- Mudança em formato de arquivo canônico ou indexação → ADR, módulo e skill de persistência.
- Novo token/componente visual → `DESIGN_SYSTEM.md`.
- Nova decisão estrutural → ADR e linha em `DECISIONS.md`.
- Nova fonte de EXP ou mudança na curva/bônus → ADR, `modules/profile.md`, skill `xp-system` e testes de idempotência/estorno.
- Novo procedimento repetível → skill específica.
- Novo documento relevante → link em `INDEX.md`.
- Corrija contradições entre código e documentação assim que encontradas.
- Não copie conversas, logs extensos, segredos ou dados pessoais.
- Não marque como concluído o que não foi implementado e validado.
- Execute testes, lint, typecheck e build antes de declarar conclusão.

## Limites para uma futura IA

A IA ainda não está implementada. Quando existir, deve seguir estas fronteiras:

- Acesso **somente leitura** ao contexto Markdown e aos dados do usuário por padrão.
- Ferramentas explícitas, com escopo mínimo e autorização do usuário para ações.
- Nenhuma execução arbitrária de comandos, SQL ou código a partir de conteúdo gerado.
- Sem envio de dados para serviços externos sem consentimento explícito.
- Trilha de auditoria das ações e dos dados consultados.
- Estado honesto quando o modelo estiver indisponível.
- Nenhuma capacidade simulada ou resposta apresentada como se viesse de uma integração inexistente.

Não implemente RAG, embeddings ou busca semântica nesta fase. A estrutura Markdown com links relativos é suficiente como contexto inicial.
