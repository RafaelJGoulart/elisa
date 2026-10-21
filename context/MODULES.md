# Módulos

Cada módulo tem limites explícitos, UI própria, serviço de frontend e, quando aplicável, rotas, serviços e repositories no backend.

| Módulo | Status | Ponto de entrada | Documentação |
| --- | --- | --- | --- |
| Início | Concluído (v0.1.0) | `/` | Este documento / [activities.md](modules/activities.md) |
| Atividades | Concluído (v0.1.0) | `/atividades` | [activities.md](modules/activities.md) |
| Diário | Concluído (v0.1.0) | `/diario` | [diary.md](modules/diary.md) |
| Conhecimento | Planejado | — | Roadmap |
| Projetos | Planejado | — | Roadmap |
| IA | Planejado | — | [AI_CONTEXT.md](AI_CONTEXT.md) |

## Atividades

**Responsabilidade:** acompanhar hábitos e práticas por data, com histórico visual, sequências e persistência local.

**Dependências:** banco SQLite, API Flask, componentes compartilhados de UI, paleta de cores.

**Frontend:**
- `frontend/src/features/activities/pages/ActivitiesPage.tsx`
- `frontend/src/features/activities/pages/ActivityDetailPage.tsx`
- componentes em `frontend/src/features/activities/components/`
- serviço em `frontend/src/services/activities.ts`

**Backend:**
- rotas em `backend/app/api/activities.py`
- regras em `backend/app/services/activity_service.py`
- dados em `backend/app/repositories/activity_repository.py`
- modelos em `backend/app/models/activity.py`

**Contratos:** ver [activities.md](modules/activities.md#api).

## Início

**Responsabilidade:** apresentar o dia atual, permitir registrar conclusões rapidamente e mostrar o mapa de módulos, com estados honestos para o que ainda não existe.

**Dependências:** API de resumo diário (`/api/today`), AppShell, toast.

**Ponto de entrada:** `frontend/src/features/home/HomePage.tsx`.

## Diário

**Responsabilidade:** escrita livre em registros Markdown, com leitura, edição, exclusão, busca e filtro por mês. O SQLite atua apenas como índice reconstruível.

**Dependências:** diretório `data/diary`, PyYAML, API Flask, componentes compartilhados de UI, toast.

**Frontend:**
- `frontend/src/features/diary/pages/DiaryPage.tsx`
- componentes em `frontend/src/features/diary/components/`
- serviço em `frontend/src/services/diary.ts`
- utilitários em `frontend/src/lib/diary.ts` e `frontend/src/lib/diaryValidation.ts`

**Backend:**
- rotas em `backend/app/api/diary.py`
- regras em `backend/app/services/diary_service.py`
- índice em `backend/app/repositories/diary_repository.py`
- arquivos Markdown em `backend/app/repositories/diary_file_store.py`
- modelo do índice em `backend/app/models/diary.py`

**Contratos e limitações:** ver [diary.md](modules/diary.md).

## Módulos planejados

- **Conhecimento:** notas Markdown, referências, busca local e vínculos. Não implementado.
- **Projetos:** projetos, etapas, decisões e materiais. Não implementado.
- **IA:** companheira com ferramentas controladas sobre o contexto local. Não implementado e sem integração ativa.

Adicionar um módulo: consulte [skills/create-module.md](skills/create-module.md).
