# Índice de contexto — Elisa

Ponto de entrada da memória documental do projeto. Leia apenas o que for relevante para a tarefa atual.

**Estado documentado:** v0.1.0 — 2026-10-21

## Comece aqui

| Documento | Quando consultar |
| --- | --- |
| [PROJECT.md](PROJECT.md) | Visão, princípios, escopo e objetivos de longo prazo. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Camadas, fluxos, API, banco e fronteiras entre módulos. |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Paleta, tipografia, componentes, grade de contribuições e acessibilidade. |
| [CONVENTIONS.md](CONVENTIONS.md) | Nomenclatura, validação, datas, testes e padrões de código. |
| [ROADMAP.md](ROADMAP.md) | O que está concluído, planejado ou bloqueado. |
| [DECISIONS.md](DECISIONS.md) | Índice das decisões arquiteturais (ADRs). |
| [MODULES.md](MODULES.md) | Módulos existentes, responsabilidades e pontos de entrada. |
| [AI_CONTEXT.md](AI_CONTEXT.md) | Como agentes devem usar e atualizar esta documentação. |

## Módulos

- [Atividades](modules/activities.md) — CRUD, registros diários, histórico e sequências.
- [Diário](modules/diary.md) — escrita livre em Markdown, índice SQLite reconstruível, busca e edição.
- Conhecimento, Projetos e IA existem apenas como estado planejado na interface. Não há implementação.

## Decisões registradas

- [ADR-001 — Monólito modular local-first](decisions/ADR-001-monolito-modular-local-first.md)
- [ADR-002 — SQLite com SQLAlchemy e migrações](decisions/ADR-002-sqlite-sqlalchemy-migracoes.md)
- [ADR-003 — Cores como chaves de paleta](decisions/ADR-003-cores-como-chaves.md)
- [ADR-004 — Um registro por atividade e dia](decisions/ADR-004-registro-diario-unico.md)
- [ADR-005 — Feather Icons via componente compartilhado](decisions/ADR-005-feather-icons.md)
- [ADR-006 — Formulários com estado controlado e Zod](decisions/ADR-006-formularios-zod.md)
- [ADR-007 — Vite no desenvolvimento, Flask no build local](decisions/ADR-007-serving-frontend.md)
- [ADR-008 — Sem autenticação na versão local](decisions/ADR-008-sem-autenticacao-local.md)
- [ADR-009 — Markdown canônico e índice SQLite reconstruível](decisions/ADR-009-markdown-canonico-indice-sqlite.md)

## Skills operacionais

- [Criar um novo módulo](skills/create-module.md)
- [Adicionar endpoint Flask](skills/add-api-endpoint.md)
- [Criar ou alterar UI React](skills/react-ui.md)
- [Criar migração de banco](skills/database-migration.md)
- [Persistência Markdown e índice](skills/markdown-persistence.md)
- [Escrever e executar testes](skills/testing.md)
- [Atualizar a documentação](skills/update-docs.md)
- [Backup e restauração do banco](skills/backup-restore.md)

## Leitura por tarefa

- **Nova funcionalidade de backend:** ARCHITECTURE → CONVENTIONS → módulo afetado → skill `add-api-endpoint`.
- **Nova tela ou componente:** DESIGN_SYSTEM → CONVENTIONS → skill `react-ui`.
- **Alteração de dados:** ARCHITECTURE → DECISIONS → skill `database-migration` → skill `backup-restore`.
- **Novo módulo:** PROJECT → MODULES → DECISIONS → skill `create-module`.
- **Retomada geral:** este índice → ROADMAP → AI_CONTEXT.

## Manutenção

1. Atualize o documento afetado no mesmo momento da mudança de código.
2. Adicione links aqui quando criar documentos relevantes.
3. Registre decisões duráveis como ADR; não registre escolhas triviais.
4. Não copie conversas inteiras nem segredos para `context/`.
5. Se documentação e código divergirem, investigue e corrija a fonte correta.
