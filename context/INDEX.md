# Índice de contexto — Elisa

Ponto de entrada da memória documental do projeto. Leia apenas o que for relevante para a tarefa atual.

**Estado documentado:** v0.2.0 com perfil e EXP — 2026-10-22

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

- [Atividades](modules/activities.md) — hábitos binários e mensuráveis, unidades, metas, histórico e sequências.
- [Diário](modules/diary.md) — escrita livre em Markdown, índice SQLite reconstruível, busca e edição.
- [Mídia](modules/media.md) — catálogo local, tipos, gêneros, eventos de consumo, progresso e estatísticas.
- [Perfil e EXP](modules/profile.md) — nível, progresso, estatísticas, categorias e extrato de eventos.
- Conhecimento, Projetos e IA existem apenas como estado planejado na interface. Não há implementação.

## Operação desktop

- [Launcher desktop](decisions/ADR-010-launcher-desktop-pywebview.md) — janela de controle em `desktop/launcher.html`, iniciada por `elisa_desktop.py` ou `iniciar_elisa.cmd`; a interface React continua no navegador.

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
- [ADR-010 — Launcher desktop local com pywebview](decisions/ADR-010-launcher-desktop-pywebview.md)
- [ADR-011 — Hábitos mensuráveis sobre a entidade de atividades](decisions/ADR-011-habitos-mensuraveis.md)
- [ADR-012 — Catálogo local de mídia com eventos de consumo](decisions/ADR-012-media-tracker.md)
- [ADR-013 — EXP centralizado em extrato de eventos](decisions/ADR-013-exp-ledger.md)
- [ADR-014 — Agentes especializados e delegação](decisions/ADR-014-agentes-especializados-e-delegacao.md)
- [ADR-015 — Separação entre validação, estatísticas e orquestração de Atividades](decisions/ADR-015-separacao-servicos-atividades.md)

## Agentes de programação

- [ADR-014 — Agentes especializados e delegação](decisions/ADR-014-agentes-especializados-e-delegacao.md)
- Skill nativa [delegação e trabalho paralelo](../.opencode/skills/delegation-workflow/SKILL.md).
- Skill nativa [contexto da Elisa](../.opencode/skills/elisa-context/SKILL.md).
- Subagentes: [database-specialist](../.opencode/agent/database-specialist.md), [backend-specialist](../.opencode/agent/backend-specialist.md), [frontend-specialist](../.opencode/agent/frontend-specialist.md) e [test-review-specialist](../.opencode/agent/test-review-specialist.md).

## Skills operacionais

- [Criar um novo módulo](skills/create-module.md)
- [Adicionar endpoint Flask](skills/add-api-endpoint.md)
- [Criar ou alterar UI React](skills/react-ui.md)
- [Criar migração de banco](skills/database-migration.md)
- [Persistência Markdown e índice](skills/markdown-persistence.md)
- [Adicionar uma fonte de EXP](skills/xp-system.md)
- [Escrever e executar testes](skills/testing.md)
- [Atualizar a documentação](skills/update-docs.md)
- [Backup e restauração do banco](skills/backup-restore.md)
- [Executar e diagnosticar o launcher desktop](skills/desktop-launcher.md)

## Leitura por tarefa

- **Nova funcionalidade de backend:** ARCHITECTURE → CONVENTIONS → módulo afetado → skill `add-api-endpoint`.
- **Nova tela ou componente:** DESIGN_SYSTEM → CONVENTIONS → skill `react-ui`.
- **Alteração de dados:** ARCHITECTURE → DECISIONS → skill `database-migration` → skill `backup-restore`.
- **Nova regra de EXP:** módulo Perfil e EXP → ADR-013 → skill `xp-system`.
- **Novo módulo:** PROJECT → MODULES → DECISIONS → skill `create-module`.
- **Delegação:** AGENTS → esta seção → skill nativa `delegation-workflow` → subagente especializado.
- **Retomada geral:** este índice → ROADMAP → AI_CONTEXT.

## Manutenção

1. Atualize o documento afetado no mesmo momento da mudança de código.
2. Adicione links aqui quando criar documentos relevantes.
3. Registre decisões duráveis como ADR; não registre escolhas triviais.
4. Não copie conversas inteiras nem segredos para `context/`.
5. Se documentação e código divergirem, investigue e corrija a fonte correta.
