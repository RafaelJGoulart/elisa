# Decisões arquiteturais

Índice de decisões duráveis. Escolhas triviais não viram ADR.

| ADR | Decisão | Status | Data |
| --- | --- | --- | --- |
| [ADR-001](decisions/ADR-001-monolito-modular-local-first.md) | Monólito modular local-first | Aceita | 2026-10-21 |
| [ADR-002](decisions/ADR-002-sqlite-sqlalchemy-migracoes.md) | SQLite com SQLAlchemy e migrações | Aceita | 2026-10-21 |
| [ADR-003](decisions/ADR-003-cores-como-chaves.md) | Cores como chaves de paleta | Aceita | 2026-10-21 |
| [ADR-004](decisions/ADR-004-registro-diario-unico.md) | Um registro por atividade e dia | Aceita (binários; ver ADR-011) | 2026-10-21 |
| [ADR-005](decisions/ADR-005-feather-icons.md) | Feather Icons via componente compartilhado | Aceita | 2026-10-21 |
| [ADR-006](decisions/ADR-006-formularios-zod.md) | Formulários com estado controlado e Zod | Aceita | 2026-10-21 |
| [ADR-007](decisions/ADR-007-serving-frontend.md) | Vite no desenvolvimento, Flask no build local | Aceita | 2026-10-21 |
| [ADR-008](decisions/ADR-008-sem-autenticacao-local.md) | Sem autenticação na versão local | Aceita | 2026-10-21 |
| [ADR-009](decisions/ADR-009-markdown-canonico-indice-sqlite.md) | Markdown canônico e índice SQLite reconstruível | Aceita | 2026-10-21 |
| [ADR-010](decisions/ADR-010-launcher-desktop-pywebview.md) | Launcher desktop local com pywebview | Aceita | 2026-10-21 |
| [ADR-011](decisions/ADR-011-habitos-mensuraveis.md) | Hábitos mensuráveis sobre a entidade de atividades | Aceita | 2026-10-22 |
| [ADR-012](decisions/ADR-012-media-tracker.md) | Catálogo local de mídia com eventos de consumo | Aceita | 2026-10-22 |
| [ADR-013](decisions/ADR-013-exp-ledger.md) | EXP centralizado em extrato de eventos | Aceita | 2026-10-22 |
| [ADR-014](decisions/ADR-014-agentes-especializados-e-delegacao.md) | Agentes especializados e delegação | Aceita | 2026-10-22 |

## Formato de um ADR

```text
# ADR-NNN — Título

- Data: AAAA-MM-DD
- Status: Proposta | Aceita | Substituída por ADR-NNN

## Contexto
## Problema
## Alternativas consideradas
## Decisão
## Justificativa
## Consequências e limitações
```

Ao substituir uma decisão, mantenha o ADR antigo e marque o status, apontando para o novo.
