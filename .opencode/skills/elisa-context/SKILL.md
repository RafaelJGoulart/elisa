---
name: elisa-context
description: >-
  Use no início de qualquer tarefa na Elisa ou ao retomar trabalho de outro agente.
  Define a ordem mínima de leitura da memória documental, as fontes de verdade por assunto,
  os invariantes do produto e o que deve ser atualizado antes de declarar conclusão.
---

# Contexto da Elisa

Esta skill evita dois extremos: reler toda a documentação e alterar código sem conhecer as decisões duráveis.

## Ordem mínima de leitura

1. `AGENTS.md`.
2. `context/INDEX.md`.
3. O documento do módulo afetado em `context/modules/`.
4. Um dos documentos abaixo, conforme o trabalho:
   - arquitetura ou contrato: `context/ARCHITECTURE.md`;
   - UI e identidade visual: `context/DESIGN_SYSTEM.md`;
   - padrões, datas, validação e testes: `context/CONVENTIONS.md`;
   - estado do produto: `context/ROADMAP.md`;
   - decisão estrutural: `context/DECISIONS.md` e o ADR relacionado.
5. A skill operacional específica em `context/skills/`, quando existir.
6. O código e o estado do Git. A documentação pode estar desatualizada; o código é a evidência final.

Não leia arquivos de dados, bancos, backups, `.env`, logs ou diários pessoais sem necessidade explícita e autorização.

## Fontes de verdade

| Assunto | Fonte principal |
| --- | --- |
| Visão e princípios | `context/PROJECT.md` |
| Camadas, API e banco | `context/ARCHITECTURE.md` |
| Tokens, componentes e acessibilidade | `context/DESIGN_SYSTEM.md` |
| Nomenclatura, validação, datas e testes | `context/CONVENTIONS.md` |
| Estado de implementação | `context/ROADMAP.md` |
| Decisões duráveis | `context/DECISIONS.md` e `context/decisions/` |
| Módulos e pontos de entrada | `context/MODULES.md` e `context/modules/` |
| Procedimentos do projeto | `context/skills/` |
| Delegação e subagentes | `.opencode/skills/delegation-workflow/SKILL.md` |
| Instruções gerais | `AGENTS.md` |

`context/skills/` contém procedimentos em Markdown do projeto. `.opencode/skills/` contém skills nativas carregadas pelo OpenCode. Não copie um no outro sem necessidade; referencie a fonte correta.

## Invariantes que não devem ser violados

- UI não contém regra de negócio; rotas não contêm SQL; dados passam por repositories.
- O launcher PyWebView apenas inicia, monitora e encerra o servidor. A interface React fica no navegador.
- O launcher nunca encerra processos que não iniciou.
- Validação canônica acontece no backend.
- Datas de registro são locais `YYYY-MM-DD`; timestamps de criação são UTC com `Z`.
- Cores de atividade são chaves da paleta, não hexadecimais.
- Unidades de hábito só convertem dentro da mesma dimensão; unidades personalizadas nunca convertem.
- EXP e níveis vêm do serviço central no backend, sobre `xp_events` append-only. Não crie outro sistema.
- O Diário usa Markdown canônico; o SQLite é apenas índice reconstruível. Preserve escrita atômica, validação de IDs e confinamento em `DIARY_DIR`.
- Não simule IA, dados fictícios ou funcionalidades não implementadas.
- Não adicione bibliotecas que dupliquem responsabilidades existentes. Ícones apenas Feather via `Icon.tsx`.
- Nunca registre segredos, tokens ou dados pessoais em código ou documentação.

## Antes de editar

1. Rode `git status`.
2. Confirme se já existe implementação parcial ou decisão contrária.
3. Identifique o menor escopo coerente.
4. Verifique se a mudança exige ADR, migração ou atualização de contrato.

## Antes de concluir

- Execute testes, lint, typecheck e build proporcionais ao risco.
- Atualize `context/` no mesmo momento da mudança de comportamento.
- Registre decisões estruturais como ADR e adicione a linha em `context/DECISIONS.md`.
- Atualize `context/INDEX.md` ao criar documento relevante.
- Relate limitações e o que não foi validado.
- Não faça commit, push ou publicação sem autorização explícita.

## Limites de escopo

Não implemente IA, RAG, embeddings ou busca semântica nesta fase. Não transforme a Elisa em dashboard genérico. Preserve a identidade de hub pessoal definida em `context/PROJECT.md`.
