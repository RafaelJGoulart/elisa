# Arquitetura

## Visão geral

Elisa é um monólito modular local-first com dois processos em desenvolvimento:

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
- `src/features/<modulo>/` — páginas, componentes e tipos do módulo.
- `src/services/` — contratos tipados com a API; nenhum componente chama `fetch` diretamente.
- `src/lib/` — cliente HTTP, datas, cores, validação do Diário e utilitários.
- `src/hooks/` — hooks reutilizáveis, incluindo `useAsyncResource`.
- `src/styles/globals.css` — tokens e base global.

### Fluxo de dados

1. Página usa `useAsyncResource` com um loader de `services/`.
2. `services/` chama `lib/api.ts`, que normaliza erros em `ApiError`.
3. Componentes renderizam estados de carregamento, erro, vazio e sucesso.
4. Mutações chamam o serviço, recarregam o recurso e emitem feedback via toast.
5. Regra de negócio não vive em componentes; o backend é a fonte de verdade.

### Roteamento

- `/` — início, resumo de hoje e mapa de módulos.
- `/atividades` — lista e gestão de atividades.
- `/atividades/:id` — histórico, estatísticas e registro diário.
- `/diario` — escrita, busca, filtro por mês, leitura e edição de registros.
- `*` — página não encontrada.

## Backend

### Camadas

- **API (`app/api`)**: recebe HTTP, decide status, serializa. Não contém SQL nem cálculos de domínio.
- **Services (`app/services`)**: validação, regras, cálculo de sequências, orquestração de transações.
- **Repositories (`app/repositories`)**: consultas SQLAlchemy. Nenhum SQL fora desta camada.
- **Models (`app/models`)**: tabelas, relações e restrições.
- **Core (`app/core`)**: configuração, extensões, erros, serving do frontend.

### App factory

`backend/app/__init__.py` cria a aplicação, carrega configuração, inicializa SQLAlchemy/Flask-Migrate, registra blueprints, handlers de erro e o serving opcional do build do frontend. Testes podem sobrescrever configuração (banco temporário, `SERVE_FRONTEND=false`).

### Configuração

- `DATABASE_URL` — padrão `sqlite:///data/elisa.db` calculado a partir da raiz do projeto.
- `DIARY_DIR` — padrão `data/diary`, criado automaticamente; contém os Markdown canônicos.
- `FLASK_HOST` / `FLASK_PORT` — padrão `127.0.0.1:5000`.
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
| GET | `/api/activities/:id/history?start=&end=` | Histórico e estatísticas no período. |
| POST | `/api/activities/:id/logs` | Registra conclusão `{ "date": "AAAA-MM-DD" }`. |
| DELETE | `/api/activities/:id/logs/:date` | Remove registro. |
| GET | `/api/today` | Resumo de hoje por atividade. |
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

### `activities`

- `id`, `name`, `description`, `category`, `color`
- `created_at`, `updated_at` em UTC
- `color` é uma chave da paleta, validada no backend

### `activity_logs`

- `id`, `activity_id`, `date`, `created_at`
- `date` é uma data local sem hora (`YYYY-MM-DD`)
- Restrição única `(activity_id, date)`
- Foreign key com `ON DELETE CASCADE`; PRAGMA `foreign_keys=ON` habilitado

Registros futuros são rejeitados pela API.

### `diary_entries` (índice)

- `id`, `file_path`, `title`, `entry_date`, `created_at`, `updated_at`, `tags_json`
- O corpo do Diário **não** é armazenado no banco.
- `file_path` é relativo a `DIARY_DIR` e único.
- O índice pode ser reconstruído a partir dos arquivos; arquivos malformados são reportados e preservados.

Detalhes do formato Markdown e das regras em [modules/diary.md](modules/diary.md).

## Persistência e migrações

- SQLite em `data/elisa.db`.
- Diário em Markdown sob `data/diary/AAAA/MM/<id>-<slug>.md`; o SQLite é índice auxiliar.
- Migrações Alembic em `backend/migrations/`.
- Nenhuma tabela é criada automaticamente em produção; use `flask db upgrade`.
- Testes criam esquema isolado com `db.create_all()` em banco temporário.
- Backup consistente do banco: `scripts/backup_db.py` (API de backup do SQLite).
- O Diário exige cópia separada de `data/diary/`; reconstruir o índice não recupera arquivos perdidos.

## Serving do frontend

- Desenvolvimento: Vite em `5173`, proxy `/api` para `127.0.0.1:5000`.
- Build local: `frontend/dist` servido pelo Flask com fallback para `index.html`; rotas `/api/*` nunca caem no SPA.
- Configuração em `backend/app/core/frontend.py`.

## Fronteiras de segurança

- Servidor escuta apenas `127.0.0.1` por padrão.
- Sem autenticação; adequado somente a uso local e usuário único.
- Validação de entrada no backend, além da validação de conveniência no frontend.
- Caminhos do SPA são resolvidos e verificados dentro de `frontend/dist`.
- IDs do Diário seguem `^[0-9a-f]{32}$`; caminhos nunca vêm do cliente e são resolvidos e confinados em `DIARY_DIR`.
- Escritas do Diário são atômicas; uma falha não trunca o arquivo existente.
- Nenhum comando de sistema é executado a partir de dados do usuário.
- Integrações futuras de IA devem ser read-only por padrão, com autorização explícita para qualquer ação.

## Limitações conhecidas

- Sem autenticação, backup automático, exportação ou importação.
- Listagem de atividades carrega todos os logs para calcular estatísticas; aceitável no volume pessoal atual, a revisar se crescer.
- A busca do Diário lê arquivos candidatos; edições manuais nos metadados só entram no índice após reindexação.
- O backup do SQLite não inclui `data/diary/`.
- Bundle inicial único; code splitting será considerado quando o número de módulos crescer.
- Categoria é texto livre com sugestões; não existe entidade de categoria.
- Sem testes end-to-end de navegador; testes cobrem API, persistência, calendário, formulários e componentes do Diário.
