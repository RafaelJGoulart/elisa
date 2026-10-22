# Módulos

Cada módulo tem limites explícitos, UI própria, serviço de frontend e, quando aplicável, rotas, serviços e repositories no backend.

| Módulo | Status | Ponto de entrada | Documentação |
| --- | --- | --- | --- |
| Início | Concluído (v0.2.0) | `/` | Este documento / [activities.md](modules/activities.md) |
| Atividades | Concluído (v0.2.0) | `/atividades` | [activities.md](modules/activities.md) |
| Diário | Concluído (v0.1.0) | `/diario` | [diary.md](modules/diary.md) |
| Mídia | Concluído (v0.2.0) | `/midia` | [media.md](modules/media.md) |
| Perfil e EXP | Concluído (2026-10-22) | `/perfil` | [profile.md](modules/profile.md) |
| Operação desktop | Concluído (v0.1.0) | `elisa_desktop.py` | [ADR-010](decisions/ADR-010-launcher-desktop-pywebview.md) |
| Conhecimento | Planejado | — | Roadmap |
| Projetos | Planejado | — | Roadmap |
| IA | Planejado | — | [AI_CONTEXT.md](AI_CONTEXT.md) |

## Atividades

**Responsabilidade:** acompanhar hábitos binários e mensuráveis por data, com unidades, metas opcionais, frequência, histórico visual, sequências e persistência local.

**Dependências:** banco SQLite, API Flask, componentes compartilhados de UI, paleta de cores, unidades de medida e serviço central de EXP (hábitos são a única fonte atual).

**Frontend:**
- `frontend/src/features/activities/pages/ActivitiesPage.tsx`
- `frontend/src/features/activities/pages/ActivityDetailPage.tsx`
- componentes em `frontend/src/features/activities/components/`, incluindo `ProgressEntryDialog` e `DeleteProgressEntryDialog`
- serviço em `frontend/src/services/activities.ts`

**Backend:**
- rotas em `backend/app/api/activities.py`
- orquestração em `backend/app/services/activity_service.py`
- validação em `backend/app/services/activity_validation.py`
- estatísticas e períodos em `backend/app/services/activity_stats.py`
- unidades em `backend/app/services/measurement_service.py`
- dados em `backend/app/repositories/activity_repository.py`
- modelos em `backend/app/models/activity.py`

**Contratos:** ver [activities.md](modules/activities.md#api).

## Início

**Responsabilidade:** apresentar o dia atual e permitir registrar conclusões rapidamente. A navegação entre módulos, inclusive os planejados, fica na barra lateral.

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

## Mídia

**Responsabilidade:** manter um acervo local de animes, séries, filmes, livros, mangás, jogos, cursos, podcasts e tipos personalizados, registrando consumos independentes, progresso e estatísticas de quantidade e tempo.

**Dependências:** banco SQLite, API Flask, componentes compartilhados de UI e catálogo de tipos/gêneros.

**Frontend:**
- `frontend/src/features/media/pages/MediaPage.tsx`
- `frontend/src/features/media/pages/MediaDetailPage.tsx`
- `frontend/src/features/media/pages/MediaStatsPage.tsx`
- componentes em `frontend/src/features/media/components/`
- utilitários em `frontend/src/lib/media.ts`
- serviço em `frontend/src/services/media.ts`

**Backend:**
- rotas em `backend/app/api/media.py`
- regras em `backend/app/services/media_service.py`
- dados em `backend/app/repositories/media_repository.py`
- modelos em `backend/app/models/media.py`

**Contratos e limitações:** ver [media.md](modules/media.md).

## Perfil e EXP

**Responsabilidade:** apresentar nível, EXP acumulado, progresso, estatísticas de hábitos, distribuição por categoria e extrato recente. O backend calcula EXP e níveis; o frontend apenas exibe o contrato de `/api/profile`.

**Dependências:** banco SQLite, extrato `xp_events`, mutações de Atividades, API Flask e componentes compartilhados de UI.

**Frontend:**
- `frontend/src/features/profile/pages/ProfilePage.tsx`
- componentes em `frontend/src/features/profile/components/`
- utilitários em `frontend/src/features/profile/format.ts`
- serviço em `frontend/src/services/profile.ts`

**Backend:**
- rota em `backend/app/api/profile.py`
- regras em `backend/app/services/xp_service.py`
- dados em `backend/app/repositories/xp_repository.py`
- modelo em `backend/app/models/xp.py`
- sincronização em `backend/app/services/activity_service.py`

**Contratos e limitações:** ver [profile.md](modules/profile.md) e [ADR-013](decisions/ADR-013-exp-ledger.md). Apenas hábitos geram EXP nesta versão.

## Operação desktop

**Responsabilidade:** iniciar, monitorar e encerrar o servidor local da Elisa em uma janela pequena de controle, sem hospedar a interface React.

**Dependências:** build em `frontend/dist`, banco migrado, `pywebview` e `waitress` opcionais, e runtime WebView2 no Windows.

**Arquivos:**
- `elisa_desktop.py` — ciclo de vida do servidor e da janela de controle.
- `desktop/launcher.html` — janela com estado, endereço, **Abrir Elisa**, **Encerrar Elisa** e mensagens de erro; a marca é injetada pelo gerador entre `<!-- ELISA_MARK:START -->` e `<!-- ELISA_MARK:END -->`.
- `assets/brand/elisa.ico` — ícone da janela do pywebview (triângulo com fundo transparente), aplicado por `webview.start(icon=...)`; o processo define `AppUserModelID` próprio para a barra de tarefas.
- `scripts/generate_brand_assets.py` — gera os arquivos de marca (SVG, PNG e ICO) a partir de `frontend/src/brand/mark.json`; requer Pillow.
- `iniciar_elisa.cmd` — atalho que gera o build ausente e abre o launcher.
- `backend/requirements-desktop.txt` — dependências opcionais.

**Limites:** não contém regra de negócio, não carrega o frontend, não inicia Vite, não expõe a rede e não aplica migrações automaticamente. A aplicação continua no navegador. Ver [ADR-010](decisions/ADR-010-launcher-desktop-pywebview.md).

## Módulos planejados

- **Conhecimento:** notas Markdown, referências, busca local e vínculos. Não implementado.
- **Projetos:** projetos, etapas, decisões e materiais. Não implementado.
- **IA:** companheira com ferramentas controladas sobre o contexto local. Não implementado e sem integração ativa.

Adicionar um módulo: consulte [skills/create-module.md](skills/create-module.md).
