# Módulo — Atividades

**Status:** concluído na v0.1.0
**Rotas:** `/atividades`, `/atividades/:id`
**API:** `/api/activities`, `/api/activities/:id/*`, `/api/today`

## Responsabilidade

Permitir que o usuário crie atividades pessoais e registre, por data, os dias em que as concluiu. O histórico é exibido como uma grade de contribuições com estatísticas reais, sem dados fictícios.

## Modelo de dados

### `activities`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `name` | texto | 2–80 caracteres, obrigatório |
| `description` | texto | até 500, opcional |
| `category` | texto | 1–40, obrigatório, texto livre com sugestões |
| `color` | texto | chave da paleta, obrigatória |
| `created_at` | datetime UTC | automático |
| `updated_at` | datetime UTC | automático |

### `activity_logs`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `activity_id` | inteiro | FK `activities.id`, cascade |
| `date` | data | `YYYY-MM-DD`, único por atividade |
| `created_at` | datetime UTC | automático |

## Regras de negócio

- Uma atividade pode ter no máximo um registro por dia (`UNIQUE(activity_id, date)`).
- Datas futuras são rejeitadas com 422.
- Registrar um dia já registrado retorna 409.
- Remover um registro inexistente retorna 404.
- Excluir uma atividade remove seus registros em cascata.
- Estatísticas consideram todo o histórico:
  - **total**: dias distintos concluídos;
  - **sequência atual**: dias consecutivos terminando hoje; se hoje não foi concluído, a sequência pode terminar ontem;
  - **maior sequência**: maior bloco consecutivo;
  - **primeiro/último registro**.
- A grade consulta apenas o período solicitado; o limite é 800 dias por requisição.
- A listagem inclui os últimos 84 dias de registros para a prévia dos cards.

## API

### Listar atividades

`GET /api/activities`

```json
{
  "activities": [
    {
      "id": 1,
      "name": "Leitura",
      "description": "Ler por 20 minutos.",
      "category": "Estudo",
      "color": "purple",
      "createdAt": "2026-10-21T18:00:00Z",
      "updatedAt": "2026-10-21T18:00:00Z",
      "stats": {
        "totalCompleted": 12,
        "currentStreak": 3,
        "longestStreak": 5,
        "firstCompletedAt": "2026-10-01",
        "lastCompletedAt": "2026-10-21"
      },
      "recentLogs": ["2026-10-19", "2026-10-20", "2026-10-21"]
    }
  ]
}
```

### Criar atividade

`POST /api/activities`

```json
{
  "name": "Leitura",
  "description": "Ler por 20 minutos.",
  "category": "Estudo",
  "color": "purple"
}
```

Resposta `201` com `{ "activity": { ... } }`.

### Atualizar atividade

`PATCH /api/activities/:id` aceita um ou mais campos (`name`, `description`, `category`, `color`). Resposta `200`.

### Excluir atividade

`DELETE /api/activities/:id` → `204`.

### Histórico

`GET /api/activities/:id/history?start=2026-01-01&end=2026-12-31`

```json
{
  "activity": { "...": "..." },
  "logs": [{ "date": "2026-10-21", "createdAt": "2026-10-21T18:00:00Z" }],
  "stats": { "...": "..." },
  "range": { "start": "2026-01-01", "end": "2026-12-31" }
}
```

Sem parâmetros, usa os últimos 365 dias. `start` deve ser anterior a `end`.

### Registrar e remover conclusão

- `POST /api/activities/:id/logs` com `{ "date": "2026-10-21" }` → `201` com `log` e `stats`.
- `DELETE /api/activities/:id/logs/2026-10-21` → `204`.

### Resumo de hoje

`GET /api/today`

```json
{
  "date": "2026-10-21",
  "activities": [
    {
      "activity": { "...": "..." },
      "completedToday": true,
      "currentStreak": 3,
      "totalCompleted": 12,
      "recentLogs": ["2026-10-19", "2026-10-20", "2026-10-21"]
    }
  ]
}
```

## Interface

### Início (`/`)

- Saudação e data por extenso.
- Lista "Hoje" com todas as atividades, sequência atual, mini grade das últimas 12 semanas e botão para registrar/desfazer.
- Contagem de concluídas e mensagem quando tudo foi concluído.
- Cards de módulos; Atividades e Diário estão ativos, os demais permanecem planejados.

### Lista (`/atividades`)

- Cards com cor, nome, categoria, descrição, total, sequência e prévia de 12 semanas.
- Menu de ações: abrir histórico, editar, excluir.
- Criação e edição em diálogo com validação Zod no cliente e no servidor.
- Exclusão com confirmação e aviso de perda de histórico.

### Detalhe (`/atividades/:id`)

- Estatísticas gerais em quatro cartões.
- Seletor de período: 3, 6 ou 12 meses.
- Grade de contribuições com meses, dias da semana, legenda e estados:
  - concluído (cor da atividade);
  - sem registro;
  - futuro (hachurado; não é falha);
  - hoje;
  - selecionado.
- Painel do dia selecionado com data por extenso, estado, horário do registro e ação.
- Edição e exclusão com confirmação.

## Arquivos

### Frontend

- `src/features/activities/pages/ActivitiesPage.tsx`
- `src/features/activities/pages/ActivityDetailPage.tsx`
- `src/features/activities/components/ActivityCard.tsx`
- `src/features/activities/components/ActivityFormDialog.tsx`
- `src/features/activities/components/ActivityStats.tsx`
- `src/features/activities/components/ContributionCalendar.tsx`
- `src/features/activities/components/DeleteActivityDialog.tsx`
- `src/features/activities/components/MiniContributionGrid.tsx`
- `src/features/activities/components/TodayList.tsx`
- `src/features/activities/types.ts`
- `src/services/activities.ts`
- `src/lib/dates.ts`, `src/lib/colors.ts`

### Backend

- `app/api/activities.py`
- `app/api/serializers.py`
- `app/services/activity_service.py`
- `app/repositories/activity_repository.py`
- `app/models/activity.py`

## Testes

Backend (`backend/tests/`):

- criação, listagem, atualização parcial, exclusão;
- validação de campos e cor;
- 404 e requisição sem JSON;
- persistência entre instâncias da aplicação;
- registro, conflito de duplicidade, data futura, data inválida;
- sequências, filtro por período, remoção, cascata e resumo de hoje;
- health check.

Frontend:

- geração do calendário, datas futuras e formatação local;
- estados da grade e seleção de dia;
- formulário: criação válida, erros obrigatórios e preenchimento em edição.

## Limitações e evolução

- Não há quantidade por dia; o modelo é conclusão binária.
- Categoria é texto livre, sem normalização além de trim.
- Não há arquivamento; excluir remove o histórico.
- A listagem carrega todos os logs para calcular estatísticas. Reavaliar se o volume crescer.
- Próximos passos sugeridos: exportação, filtros por categoria, arquivamento, metas e revisão periódica.
