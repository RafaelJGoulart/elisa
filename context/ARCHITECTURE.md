# Arquitetura

## Visão geral

Elisa é um monólito modular local-first. Em desenvolvimento há dois processos; no uso local consolidado, o Flask serve o build e pode ser iniciado por uma janela de controle desktop opcional via pywebview, enquanto a interface continua no navegador.

```text
Navegador
   │  http://localhost:5173 (dev)  ou  http://127.0.0.1:5000 (build local)
   ▼
React + TypeScript (Vite)
   │  /api via proxy do Vite (dev) ou mesma origem (build)
   ▼
Flask (app factory)
   ├── api/            rotas, serialização, códigos HTTP
   ├── services/       regras de negócio, validação, estatísticas
   ├── repositories/   consultas e persistência
    └── models/         SQLAlchemy
           │
           ├──▶ SQLite (data/elisa.db)
           └──▶ Markdown (data/diary/AAAA/MM/)
```

Não há microserviços, filas, cache externo ou banco remoto. O Diário usa Markdown como fonte canônica e o SQLite apenas como índice de metadados reconstruível.

## Frontend

### Organização

- `src/app/` — composição do app, router e página 404.
- `src/components/ui/` — componentes base no estilo shadcn/ui (Button, Dialog, AlertDialog, Dropdown, Input, Tooltip etc.).
- `src/components/shared/` — Icon, AppShell, PageHeader, estados de carregamento/erro/vazio, ToastProvider, seletor de cor.
- `src/features/<modulo>/` — páginas, componentes e tipos do módulo (`activities`, `media`, `diary`, `profile`, `home`).
- `src/services/` — contratos tipados com a API; nenhum componente chama `fetch` diretamente.
- `src/lib/` — cliente HTTP, datas, cores, formatação, regras de apresentação de mídia, validação do Diário e utilitários.
- `src/hooks/` — hooks reutilizáveis, incluindo `useAsyncResource`.
- `src/styles/globals.css` — tokens e base global.

### Fluxo de dados

1. Página usa `useAsyncResource` com um loader de `services/`.
2. `services/` chama `lib/api.ts`, que normaliza erros em `ApiError`.
3. Componentes renderizam estados de carregamento, erro, vazio e sucesso.
4. Mutações chamam o serviço, recarregam o recurso e emitem feedback via toast.
5. Regra de negócio não vive em componentes; o backend é a fonte de verdade.

### Roteamento

- `/` — início e resumo de hoje (hábitos binários e mensuráveis).
- `/atividades` — lista e gestão de atividades.
- `/atividades/:id` — histórico, estatísticas, registros binários e registros quantitativos.
- `/midia` — acervo com busca, filtros, ordenação, paginação e CRUD.
- `/midia/estatisticas` — estatísticas de quantidade, tempo e histórico mensal.
- `/midia/:id` — detalhe, progresso, consumos e edição.
- `/diario` — escrita, busca, filtro por mês, leitura e edição de registros.
- `/perfil` — nível, EXP, estatísticas, categorias e extrato recente.
- `*` — página não encontrada.

## Backend

### Camadas

- **API (`app/api`)**: recebe HTTP, decide status, serializa. Não contém SQL nem cálculos de domínio.
- **Services (`app/services`)**: validação, regras, cálculo de sequências, orquestração de transações.
- **Repositories (`app/repositories`)**: consultas SQLAlchemy. Nenhum SQL fora desta camada.
- **Models (`app/models`)**: tabelas, relações e restrições.
- **Core (`app/core`)**: configuração, extensões, erros, serving do frontend.

### Serviços de Atividades

O módulo separa três responsabilidades sem mudar os contratos da API:

- `activity_service.py` — orquestra CRUD, registros, transações, leituras e sincronização de EXP.
- `activity_validation.py` — valida payloads e converte campos da API para o modelo; consulta unidades e registros existentes quando a regra depende do estado atual.
- `activity_stats.py` — calcula sequências, totais, períodos e progresso, sem acessar repositories.

A separação evita que cálculo puro dependa de persistência. A validação pode consultar o repository para regras como compatibilidade de unidade, mas não inicia transações. Apenas o serviço orquestrador executa mutações e commits.

### App factory

`backend/app/__init__.py` cria a aplicação, carrega configuração, inicializa SQLAlchemy/Flask-Migrate, registra blueprints, handlers de erro e o serving opcional do build do frontend. Testes podem sobrescrever configuração (banco temporário, `SERVE_FRONTEND=false`).

### Configuração

- `DATABASE_URL` — padrão `sqlite:///data/elisa.db` calculado a partir da raiz do projeto.
- `DIARY_DIR` — padrão `data/diary`, criado automaticamente; contém os Markdown canônicos.
- `FLASK_HOST` / `FLASK_PORT` — padrão `127.0.0.1:5000`. O launcher desktop ignora `FLASK_HOST` e usa a porta de `FLASK_PORT` ou `--port`.
- `SERVE_FRONTEND` — serve `frontend/dist` quando existir.
- `MAX_HISTORY_DAYS` — limite de intervalo de histórico (800 dias).

Segredos e dados locais nunca são versionados.

## API

Prefixo `/api`. JSON em `camelCase`; banco e código Python em `snake_case`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Estado do servidor e do banco. |
| GET | `/api/activities` | Lista com estatísticas e últimos 84 dias. |
| POST | `/api/activities` | Cria atividade. |
| GET | `/api/activities/:id` | Detalhe da atividade. |
| PATCH | `/api/activities/:id` | Atualiza campos enviados. |
| DELETE | `/api/activities/:id` | Exclui atividade e registros (204). |
| GET | `/api/activities/:id/history?start=&end=` | Histórico binário ou quantitativo e estatísticas no período. |
| POST | `/api/activities/:id/logs` | Registra conclusão binária `{ "date": "AAAA-MM-DD" }`. |
| DELETE | `/api/activities/:id/logs/:date` | Remove conclusão binária. |
| GET | `/api/activities/:id/progress?start=&end=` | Lista registros quantitativos e estatísticas do período. |
| POST | `/api/activities/:id/progress` | Registra quantidade `{ "date", "amount", "unitId", "note" }`. |
| PATCH | `/api/activities/:id/progress/:entryId` | Atualiza registro quantitativo. |
| DELETE | `/api/activities/:id/progress/:entryId` | Remove registro quantitativo. |
| GET | `/api/units` | Lista unidades de medida, incluindo as padrão. |
| POST | `/api/units` | Cria unidade personalizada `{ "name", "symbol" }`. |
| GET | `/api/today` | Resumo de hoje por atividade, com estatísticas. |
| GET | `/api/profile` | Perfil com nível, EXP, estatísticas, categorias e extrato recente. |
| GET | `/api/media/types` | Lista tipos de mídia e unidades aceitas. |
| POST | `/api/media/types` | Cria tipo personalizado. |
| GET | `/api/media/genres` | Lista gêneros existentes. |
| GET | `/api/media/items?query=&type=&status=&genre=&sort=&limit=&offset=&includeArchived=` | Lista acervo com agregados. |
| POST | `/api/media/items` | Cria item do acervo. |
| GET | `/api/media/items/:id` | Detalhe com agregados e eventos. |
| PATCH | `/api/media/items/:id` | Atualiza item parcialmente. |
| DELETE | `/api/media/items/:id` | Exclui item e consumos em cascata (204). |
| GET | `/api/media/items/:id/events` | Lista consumos do item. |
| POST | `/api/media/items/:id/events` | Registra consumo. |
| GET | `/api/media/events?start=&end=&type=&genre=&limit=&offset=` | Feed de consumos com filtros. |
| PATCH | `/api/media/events/:eventId` | Atualiza consumo. |
| DELETE | `/api/media/events/:eventId` | Remove consumo. |
| GET | `/api/media/stats?start=&end=&type=&genre=` | Estatísticas de quantidade, tempo, tipo, gênero e mês. |
| GET | `/api/diary?query=&month=&start=&end=&limit=&offset=` | Lista resumos do Diário. |
| POST | `/api/diary` | Cria registro em Markdown e no índice. |
| GET | `/api/diary/:id` | Lê o registro completo do arquivo. |
| PATCH | `/api/diary/:id` | Atualiza título, conteúdo e/ou etiquetas. |
| DELETE | `/api/diary/:id` | Remove arquivo e índice (204). |
| POST | `/api/diary/reindex` | Reconstrói o índice a partir dos Markdown. |

### Formato de erro

```json
{
  "error": {
    "code": "validation_error",
    "message": "Revise os campos informados.",
    "details": { "fields": { "name": "Informe um nome para a atividade." } }
  }
}
```

Códigos usados: `validation_error` (422), `not_found` (404), `conflict` (409), `storage_error` (500, falha de arquivo do Diário), `method_not_allowed`, `internal_error`. Stack traces e caminhos internos não são expostos.

## Modelo de dados

### `measurement_units`

- `id`, `code` (único), `name`, `symbol`, `category`, `dimension`, `factor`, `is_system`, `created_at`
- `dimension` define o que pode ser convertido; `factor` converte para a unidade base da dimensão.
- Unidades personalizadas usam dimensão própria (`custom:<code>`) e nunca são convertidas para outra grandeza.
- A migração semeia 17 unidades; `measurement_service.ensure_default_units()` garante o catálogo de forma idempotente em bancos criados por testes.

### `activities`

- `id`, `name`, `description`, `category`, `color`
- `kind` (`binary` ou `measurable`), `unit_id`, `target_amount`, `frequency`, `archived`
- `created_at`, `updated_at` em UTC
- `color` é uma chave da paleta, validada no backend
- `frequency` é `daily`, `weekly` ou `monthly`; hábitos binários permanecem diários
- `unit_id` referencia `measurement_units` com `ON DELETE SET NULL`; hábitos mensuráveis exigem unidade

### `activity_logs`

- `id`, `activity_id`, `date`, `created_at`
- `date` é uma data local sem hora (`YYYY-MM-DD`)
- Restrição única `(activity_id, date)`
- Foreign key com `ON DELETE CASCADE`; PRAGMA `foreign_keys=ON` habilitado

Registros futuros são rejeitados pela API. Hábitos mensuráveis não usam esta tabela.

### `activity_progress_entries`

- `id`, `activity_id`, `entry_date`, `amount`, `unit_id`, `note`, `created_at`, `updated_at`
- `amount` usa `NUMERIC(14,4)`; vários registros podem existir no mesmo dia
- `unit_id` guarda a unidade original do registro e usa `ON DELETE RESTRICT`
- A agregação converte cada quantidade para a unidade do hábito; o registro original nunca é reescrito
- Foreign key da atividade com `ON DELETE CASCADE`

### `media_types`

- `id`, `code` (único), `name`, `default_unit`, `unit_label`, `is_system`, `created_at`
- Doze tipos padrão são semeados pela migração e garantidos de forma idempotente em runtime
- Tipos personalizados usam `custom-<slug>` e reutilizam o contrato

### `media_genres` e `media_item_genres`

- `media_genres`: `id`, `name` (único), `created_at`
- `media_item_genres`: associação N:N com `ON DELETE CASCADE` nos dois lados
- Gêneros são criados sob demanda a partir do texto informado no item

### `media_items`

- `id`, `media_type_id`, `title`, `alternate_title`, `description`, `release_year`, `creator`
- `total_units`, `total_volumes`, `average_duration_minutes`, `total_duration_minutes`, `unit_label`, `rating`, `notes`
- `status` (`want`, `in_progress`, `completed`, `paused`, `dropped`), `started_on`, `finished_on`, `archived`
- `progress_override` permite corrigir o progresso sem apagar o consumo registrado
- Restrição única `(media_type_id, title)`; tipo com `ON DELETE RESTRICT`
- `created_at`, `updated_at` em UTC

### `media_consumption_events`

- `id`, `media_item_id`, `consumed_on`, `amount`, `unit`, `duration_minutes`, `note`, `is_repeat`
- `consumed_on` é data local; `amount` usa `NUMERIC(14,3)`
- `duration_minutes` representa tempo real informado; quando ausente, a API pode estimar a partir das durações conhecidas do item
- `is_repeat` marca revisitas: somam no consumo, mas não avançam o progresso
- Foreign key do item com `ON DELETE CASCADE`
- `created_at`, `updated_at` em UTC

A classificação de tempo (`real`, `estimated`, `unknown`), a contagem única de obras concluídas e as regras de progresso estão em [modules/media.md](modules/media.md).

### `diary_entries` (índice)

- `id`, `file_path`, `title`, `entry_date`, `created_at`, `updated_at`, `tags_json`
- O corpo do Diário **não** é armazenado no banco.
- `file_path` é relativo a `DIARY_DIR` e único.
- O índice pode ser reconstruído a partir dos arquivos; arquivos malformados são reportados e preservados.

Detalhes do formato Markdown e das regras em [modules/diary.md](modules/diary.md).

### `xp_events` (extrato)

- `id`, `event_key` (único), `activity_id` (sem FK), `source`, `source_ref`, `category`, `kind`, `reason`, `description`, `amount`, `activity_date`, `recorded_at`
- Extrato append-only; o saldo é `SUM(amount)` e correções usam sinal oposto
- `event_key` combina origem lógica e geração; a sincronização é idempotente
- `activity_id` é referência histórica e não é apagado em cascata, preservando o extrato após excluir a atividade
- Apenas hábitos geram eventos nesta versão; regras, origens e fórmula de níveis em [modules/profile.md](modules/profile.md) e [ADR-013](decisions/ADR-013-exp-ledger.md)

## Persistência e migrações

- SQLite em `data/elisa.db`.
- Diário em Markdown sob `data/diary/AAAA/MM/<id>-<slug>.md`; o SQLite é índice auxiliar.
- Migrações Alembic em `backend/migrations/`.
- A migração `3c75e125a588` adiciona hábitos mensuráveis e o acervo de mídia, semeia unidades e tipos e preserva registros existentes. Ela desativa temporariamente as foreign keys do SQLite durante a recriação em lote de `activities` para não apagar `activity_logs`.
- A migração `1cd28703a86b` adiciona `xp_events`; dados históricos de hábitos são sincronizados de forma idempotente na primeira leitura de `/api/profile`. Faça backup antes de migrar.
- Nenhuma tabela é criada automaticamente em produção; use `flask db upgrade`.
- Testes criam esquema isolado com `db.create_all()` em banco temporário.
- Backup consistente do banco: `scripts/backup_db.py` (API de backup do SQLite).
- O Diário exige cópia separada de `data/diary/`; reconstruir o índice não recupera arquivos perdidos.

## Serving do frontend

- Desenvolvimento: Vite em `5173`, proxy `/api` para `127.0.0.1:5000`.
- Build local: `frontend/dist` servido pelo Flask com fallback para `index.html`; rotas `/api/*` nunca caem no SPA.
- Configuração em `backend/app/core/frontend.py`.

## Launcher desktop (opcional)

- Ponto de entrada: `elisa_desktop.py`; atalho: `iniciar_elisa.cmd`.
- Janela de controle: `desktop/launcher.html`. Ela mostra o estado do serviço, o endereço local, **Abrir Elisa** e **Encerrar Elisa**. A interface React não é carregada dentro dela.
- Ícone da janela: `assets/brand/elisa.ico` (triângulo com fundo transparente), aplicado por `webview.start(icon=...)`. O arquivo é gerado por `scripts/generate_brand_assets.py` a partir de `frontend/src/brand/mark.json`. O processo define `AppUserModelID` próprio (`Elisa.Desktop`) antes de abrir a janela para que a barra de tarefas use o ícone da marca, não o do Python.
- A aplicação principal continua aberta no navegador padrão, em `http://127.0.0.1:<porta>`.
- Dependências opcionais: `pywebview` e `waitress` em `backend/requirements-desktop.txt`; o backend e os testes não dependem delas.
- O launcher valida `frontend/dist/index.html` e o esquema do banco antes de iniciar o servidor. Migrações continuam explícitas.
- O servidor Waitress roda em uma thread em `127.0.0.1`; fechar a janela ou usar **Encerrar Elisa** para somente o servidor pertencente ao launcher.
- Se já existir uma instância da Elisa no endereço, o launcher entra em estado de instância externa, permite abri-la e não encerra esse processo.
- `FLASK_HOST` não é usado no desktop. O launcher não deve ser adaptado para exposição na rede sem autenticação e revisão de segurança.
- Diagnóstico em `data/elisa-desktop.log` (ignorado pelo Git).

## Fronteiras de segurança

- Servidor escuta apenas `127.0.0.1` por padrão; o launcher desktop sempre usa loopback.
- Sem autenticação; adequado somente a uso local e usuário único.
- Validação de entrada no backend, além da validação de conveniência no frontend.
- Caminhos do SPA são resolvidos e verificados dentro de `frontend/dist`.
- IDs do Diário seguem `^[0-9a-f]{32}$`; caminhos nunca vêm do cliente e são resolvidos e confinados em `DIARY_DIR`.
- Escritas do Diário são atômicas; uma falha não trunca o arquivo existente.
- Nenhum comando de sistema é executado a partir de dados do usuário.
- Integrações futuras de IA devem ser read-only por padrão, com autorização explícita para qualquer ação.

## Limitações conhecidas

- Sem autenticação, backup automático, exportação ou importação.
- Listagem de atividades carrega todos os logs e registros quantitativos para calcular estatísticas; aceitável no volume pessoal atual, a revisar se crescer.
- A busca do Diário lê arquivos candidatos; edições manuais nos metadados só entram no índice após reindexação.
- Estatísticas de mídia carregam itens e eventos em memória; o acervo pessoal atual é pequeno, mas a consulta deve ser paginada/agregada no banco se crescer.
- Mídia não possui capas, importação externa, temporadas, episódios individualizados ou busca online.
- O backup do SQLite não inclui `data/diary/`.
- Bundle inicial único; code splitting será considerado quando o número de módulos crescer.
- Categoria é texto livre com sugestões; não existe entidade de categoria.
- EXP existe apenas para hábitos; Mídia, Diário, Projetos e Conhecimento não pontuam. O extrato é lido integralmente para calcular o total e a sincronização percorre todos os hábitos ao abrir o perfil.
- Não há recorrência personalizada por dia da semana; a frequência semanal é o caso suportado. O extrato cresce com o uso e não possui edição manual.
- Sem testes end-to-end de navegador; testes cobrem API, persistência, migração, calendário, formulários, componentes de Atividades, Diário, Mídia e Perfil, além de regras de EXP.
- O launcher desktop não é empacotado como executável independente e exige o ambiente virtual, o build do frontend e o runtime WebView2.
