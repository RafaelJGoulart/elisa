# Módulo — Atividades

**Status:** concluído na v0.2.0
**Rotas:** `/atividades`, `/atividades/:id`
**API:** `/api/activities`, `/api/activities/:id/*`, `/api/units`, `/api/today`

## Responsabilidade

Permitir que o usuário crie hábitos binários ou mensuráveis, registre conclusões ou quantidades por data e acompanhe histórico, sequências e estatísticas reais. O módulo não simula metas, lembretes ou conquistas.

Dois tipos coexistem:

- **Binário:** conclusão por dia, com no máximo um registro diário.
- **Mensurável:** quantidade por registro, vários registros por dia, unidade de medida, meta opcional e frequência diária, semanal ou mensal.

## Modelo de dados

### `measurement_units`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `code` | texto | único, estável |
| `name` | texto | nome exibido |
| `symbol` | texto | símbolo curto |
| `category` | texto | agrupamento visual (Volume, Distância, Tempo etc.) |
| `dimension` | texto | grandeza usada na conversão |
| `factor` | decimal | fator para a unidade base da dimensão |
| `is_system` | booleano | identifica unidade semeada |
| `created_at` | datetime UTC | automático |

Unidades padrão: `ml`, `l`, `m`, `km`, `s`, `min`, `h`, `pages`, `unit`, `repetition`, `exercise`, `word`, `chapter`, `brl`, `g`, `kg` e `kcal`. A migração semeia as 17; `measurement_service.ensure_default_units()` garante o catálogo de forma idempotente em bancos criados por testes.

### `activities`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `name` | texto | 2–80 caracteres, obrigatório |
| `description` | texto | até 500, opcional |
| `category` | texto | 1–40, obrigatório, texto livre com sugestões |
| `color` | texto | chave da paleta, obrigatória |
| `kind` | texto | `binary` ou `measurable` |
| `unit_id` | inteiro | FK `measurement_units.id`, obrigatória em hábitos mensuráveis |
| `target_amount` | decimal | meta opcional, expressa na unidade do hábito |
| `frequency` | texto | `daily`, `weekly` ou `monthly` |
| `archived` | booleano | filtro de listagem; sem exclusão de histórico |
| `created_at` | datetime UTC | automático |
| `updated_at` | datetime UTC | automático |

### `activity_logs`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `activity_id` | inteiro | FK `activities.id`, cascade |
| `date` | data | `YYYY-MM-DD`, único por atividade |
| `created_at` | datetime UTC | automático |

Usada apenas por hábitos binários.

### `activity_progress_entries`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `activity_id` | inteiro | FK `activities.id`, cascade |
| `entry_date` | data | `YYYY-MM-DD` |
| `amount` | decimal | maior que zero, até 4 casas decimais |
| `unit_id` | inteiro | FK `measurement_units.id`, `RESTRICT` |
| `note` | texto | até 500, opcional |
| `created_at` | datetime UTC | automático |
| `updated_at` | datetime UTC | automático |

Vários registros podem existir no mesmo dia. A unidade original é preservada; a conversão ocorre apenas na agregação.

## Regras de negócio

### Comum aos dois tipos

- Datas futuras são rejeitadas com 422.
- Excluir uma atividade estorna o EXP líquido das origens daquela atividade e depois remove conclusões e registros quantitativos em cascata. O extrato permanece.
- A listagem inclui os últimos 84 dias para a prévia dos cards.
- O histórico aceita intervalo de até 800 dias; sem parâmetros, usa os últimos 365 dias.
- O campo `archived` existe na API, no serializer e na listagem (`includeArchived`); a interface ainda não oferece uma ação de arquivar.

### Hábitos binários

- No máximo um registro por dia (`UNIQUE(activity_id, date)`).
- Registrar um dia já registrado retorna 409; remover registro inexistente retorna 404.
- Frequência permanece `daily`; unidade e meta são sempre nulas.
- Estatísticas consideram todo o histórico:
  - **total**: dias distintos concluídos;
  - **sequência atual**: dias consecutivos terminando hoje; se hoje não foi concluído, a sequência pode terminar ontem;
  - **maior sequência**: maior bloco consecutivo;
  - **primeiro/último registro**.
- Enviar quantidade para um hábito binário retorna 422.

### Hábitos mensuráveis

- Exigem unidade de medida. A meta é opcional e positiva.
- Vários registros por dia são permitidos; editar e excluir recalculam as estatísticas.
- Cada registro aceita uma unidade compatível com a unidade do hábito. Unidades da mesma dimensão são convertidas por `factor`; grandezas diferentes e unidades personalizadas incompatíveis são rejeitadas.
- A troca para outra unidade compatível converte a meta existente. Se houver registros e a nova unidade for de outra dimensão, a troca é rejeitada; exclua os registros antes.
- Trocar de `binary` para `measurable` é bloqueado enquanto houver conclusões diárias. Trocar de `measurable` para `binary` é bloqueado enquanto houver registros quantitativos.
- Sem meta, um período é cumprido quando a soma é maior que zero. Com meta, quando a soma convertida atinge `target_amount`.
- Semanas vão de domingo a sábado; meses seguem o calendário local.
- Estatísticas:
  - `totalAmount`: soma convertida de todo o histórico;
  - `todayAmount`: soma do dia atual;
  - `currentPeriodStart` / `currentPeriodEnd`: limites do período atual;
  - `currentPeriodAmount`, `currentPeriodPercent` e `currentPeriodMet`: progresso no período atual;
  - `weekAmount` / `monthAmount`: somas da semana e do mês correntes;
  - `averagePerRecordedDay`: média por dia com registro;
  - `recordedDays`, `entriesCount` e `periodsMet`;
  - `totalCompleted`, `currentStreak`, `longestStreak`, `firstCompletedAt` e `lastCompletedAt`, calculados por período cumprido;
  - `daily[]`: data, quantidade, número de registros e `goalMet` por dia com registro.
- Na grade, a frequência diária destaca dias com meta atingida; frequências semanal e mensal destacam dias com registro. O cumprimento é avaliado nas estatísticas por período.
- No resumo de hoje, `completedToday` significa que a meta do período atual foi atingida — no caso semanal ou mensal, não necessariamente hoje.

### Integração com EXP

- Criar, editar ou remover conclusões e registros sincroniza o EXP da atividade no serviço central; a regra não vive neste módulo nem no frontend.
- Hábito binário concede 1 EXP por dia concluído. Hábito mensurável concede 1 EXP por período cumprido (dia, semana ou mês, conforme a frequência).
- Semana completa concede 7 EXP adicionais para hábitos diários e semanais; registros parciais não pontuam.
- Editar data, quantidade ou conclusão recalcula o saldo, com estorno quando necessário.
- Regras completas, extrato e fórmula de níveis em [profile.md](profile.md) e [ADR-013](../decisions/ADR-013-exp-ledger.md).

## API

### Listar atividades

`GET /api/activities?includeArchived=true`

```json
{
  "activities": [
    {
      "id": 1,
      "name": "Água",
      "description": "Beber ao longo do dia.",
      "category": "Saúde",
      "color": "blue",
      "kind": "measurable",
      "frequency": "daily",
      "unit": {
        "id": 2,
        "code": "l",
        "name": "Litro",
        "symbol": "L",
        "category": "Volume",
        "dimension": "volume",
        "isSystem": true
      },
      "targetAmount": 2,
      "archived": false,
      "createdAt": "2026-10-22T12:00:00Z",
      "updatedAt": "2026-10-22T12:00:00Z",
      "stats": {
        "totalCompleted": 8,
        "currentStreak": 2,
        "longestStreak": 4,
        "firstCompletedAt": "2026-10-01",
        "lastCompletedAt": "2026-10-22",
        "totalAmount": 17.5,
        "todayAmount": 1.5,
        "currentPeriodStart": "2026-10-22",
        "currentPeriodEnd": "2026-10-22",
        "currentPeriodAmount": 1.5,
        "currentPeriodPercent": 75,
        "currentPeriodMet": false,
        "weekAmount": 10.5,
        "monthAmount": 17.5,
        "averagePerRecordedDay": 2.1875,
        "recordedDays": 8,
        "entriesCount": 9,
        "periodsMet": 8,
        "daily": [
          { "date": "2026-10-22", "amount": 1.5, "entries": 2, "goalMet": false }
        ]
      },
      "recentLogs": ["2026-10-21"]
    }
  ]
}
```

`recentLogs` é sempre uma lista de datas: conclusões em hábitos binários, dias com meta atingida na frequência diária e dias com registro nas frequências semanal/mensal.

### Criar atividade

`POST /api/activities`

```json
{
  "name": "Água",
  "description": "Beber ao longo do dia.",
  "category": "Saúde",
  "color": "blue",
  "kind": "measurable",
  "unitId": 2,
  "targetAmount": 2,
  "frequency": "daily"
}
```

Resposta `201` com `{ "activity": { ... } }`. Para hábito binário, envie `kind: "binary"` e omita unidade, meta e frequência (ou envie `frequency: "daily"`).

### Atualizar atividade

`PATCH /api/activities/:id` aceita `name`, `description`, `category`, `color`, `kind`, `unitId`, `targetAmount`, `frequency` e `archived`. Resposta `200`.

### Excluir atividade

`DELETE /api/activities/:id` → `204`.

### Histórico

`GET /api/activities/:id/history?start=2026-01-01&end=2026-12-31`

```json
{
  "activity": { "...": "..." },
  "logs": [{ "date": "2026-10-21", "createdAt": "2026-10-21T18:00:00Z" }],
  "progressEntries": [
    {
      "id": 7,
      "activityId": 1,
      "date": "2026-10-22",
      "amount": 500,
      "unit": { "id": 1, "code": "ml", "symbol": "ml", "...": "..." },
      "note": null,
      "createdAt": "2026-10-22T12:10:00Z",
      "updatedAt": "2026-10-22T12:10:00Z"
    }
  ],
  "completedDates": ["2026-10-21", "2026-10-22"],
  "stats": { "...": "..." },
  "range": { "start": "2026-01-01", "end": "2026-12-31" }
}
```

`logs` e `progressEntries` são filtrados pelo intervalo; as estatísticas sempre consideram todo o histórico. `completedDates` contém as conclusões binárias, os dias com meta atingida (frequência diária) ou os dias com registro (semanal/mensal) dentro do intervalo.

### Registrar e remover conclusão binária

- `POST /api/activities/:id/logs` com `{ "date": "2026-10-21" }` → `201` com `log` e `stats`.
- `DELETE /api/activities/:id/logs/2026-10-21` → `204`.

### Registros quantitativos

- `GET /api/activities/:id/progress?start=&end=` → `{ entries, stats, range }`.
- `POST /api/activities/:id/progress` com `{ "date": "2026-10-22", "amount": 1.5, "unitId": 2, "note": null }` → `201` com `entry` e `stats`.
- `PATCH /api/activities/:id/progress/:entryId` aceita `date`, `amount`, `unitId` e `note`; campos omitidos preservam o valor atual → `200`.
- `DELETE /api/activities/:id/progress/:entryId` → `204`.
- Enviar quantidade para atividade binária ou conclusão para mensurável retorna 422.

### Unidades

- `GET /api/units` → `{ "units": [ ... ] }`, incluindo as unidades padrão.
- `POST /api/units` com `{ "name": "Páginas de mangá", "symbol": "pág." }` → `201` com a unidade personalizada. O código é derivado do nome (`custom-<slug>`), a categoria é `Personalizada` e a dimensão é própria, impedindo conversão acidental.

### Resumo de hoje

`GET /api/today`

```json
{
  "date": "2026-10-22",
  "activities": [
    {
      "activity": { "...": "..." },
      "completedToday": true,
      "currentStreak": 3,
      "totalCompleted": 12,
      "recentLogs": ["2026-10-20", "2026-10-21", "2026-10-22"],
      "stats": { "...": "..." }
    }
  ]
}
```

## Interface

### Início (`/`)

- Saudação e data por extenso.
- Grade de cartões finos com todas as atividades do dia (até 3 por linha).
- Cada cartão mostra nome, categoria, sequência atual, prévia das últimas 12 semanas e ação de registrar/desfazer (binário) ou de abrir o detalhe para registrar quantidade (mensurável).
- Contagem de concluídas e mensagem quando tudo foi concluído. Em hábitos semanais/mensais, a conclusão reflete o período atual.

### Lista (`/atividades`)

- Cards com cor, nome, categoria, descrição, total, sequência e prévia de 12 semanas.
- Menu de ações: abrir histórico, editar, excluir.
- Criação e edição em diálogo com validação Zod no cliente e no servidor.
- O formulário alterna entre binário e mensurável, permite escolher unidade, criar unidade personalizada, definir meta e frequência.
- Exclusão com confirmação e aviso de perda de histórico.

### Detalhe (`/atividades/:id`)

- Cabeçalho com cor, categoria, tipo, unidade/frequência, descrição e estado de arquivamento.
- Estatísticas gerais: para binários, dias concluídos, sequência atual, maior sequência e último registro; para mensuráveis, total acumulado, progresso do período, períodos cumpridos, registros, sequência, média por dia registrado e último período cumprido.
- Seletor de período: 3, 6 ou 12 meses.
- Grade de contribuições com meses, dias da semana, legenda e estados:
  - concluído (cor da atividade);
  - sem registro;
  - futuro (hachurado; não é falha);
  - hoje (borda `text-secondary`, nomeado no rótulo acessível);
  - selecionado.
- Células de 24 px (alvo de toque conforme a WCAG 2.5.8) com semântica `role="grid"`; apenas uma célula é alcançável pelo Tab e as setas, `Home` e `End` movem o foco dentro da grade.
- Painel do dia selecionado:
  - binário: estado, horário do registro e ação de registrar/desfazer;
  - mensurável: total do dia, quantidade de registros, progresso do período atual, ação de registrar quantidade e lista dos registros do dia com editar/excluir.
- Diálogo de registro quantitativo aceita data, quantidade, unidade compatível e observação; aceita múltiplos registros por dia.
- Exclusão de registro quantitativo com confirmação.

## Arquivos

### Frontend

- `src/features/activities/pages/ActivitiesPage.tsx`
- `src/features/activities/pages/ActivityDetailPage.tsx`
- `src/features/activities/components/ActivityCard.tsx`
- `src/features/activities/components/ActivityFormDialog.tsx`
- `src/features/activities/components/ActivityStats.tsx`
- `src/features/activities/components/ContributionCalendar.tsx`
- `src/features/activities/components/DeleteActivityDialog.tsx`
- `src/features/activities/components/DeleteProgressEntryDialog.tsx`
- `src/features/activities/components/MiniContributionGrid.tsx`
- `src/features/activities/components/ProgressEntryDialog.tsx`
- `src/features/activities/components/TodayList.tsx`
- `src/features/activities/types.ts`
- `src/services/activities.ts`
- `src/lib/dates.ts`, `src/lib/colors.ts`, `src/lib/format.ts`

### Backend

- `app/api/activities.py`
- `app/api/serializers.py`
- `app/services/activity_service.py`
- `app/services/measurement_service.py`
- `app/services/xp_service.py` (sincronização chamada pelas mutações)
- `app/repositories/xp_repository.py`
- `app/models/xp.py`
- `app/repositories/activity_repository.py`
- `app/models/activity.py`
- `backend/migrations/versions/3c75e125a588_measurable_habits_and_media_tracker.py`
- `backend/migrations/versions/1cd28703a86b_add_xp_events_ledger.py`

## Testes

Backend (`backend/tests/`):

- `test_activities.py` e `test_logs.py`: CRUD, validação, sequências, filtros, cascata e resumo de hoje do modelo binário;
- `test_habits.py` (11 testes): unidades padrão e personalizadas, múltiplos registros, conversão compatível, rejeição de grandezas incompatíveis, troca de unidade com conversão de meta, frequência semanal, hábito sem meta, validação, bloqueio de troca de tipo e persistência;
- `test_xp.py` (10 testes): concessão, bônus, idempotência, backfill histórico, estorno, registros parciais, edição, exclusão de atividade e hábito arquivado;
- `test_migrations.py`: migração preserva atividades e conclusões existentes, semeia unidades e tipos e cria/remove `xp_events`.

Frontend:

- geração do calendário, datas futuras e formatação local;
- estados da grade e seleção de dia;
- formulário: criação válida, erros obrigatórios, preenchimento em edição e alternância entre tipos;
- diálogo de progresso: registro válido, unidade e erros.

## Limitações e evolução

- Não há lembretes, notificações ou criação automática de registros.
- Metas não geram conquistas; o EXP é concedido por ocorrência e bônus semanal, sem medalhas.
- Não há recorrência personalizada por dia da semana; a frequência semanal é o caso mais próximo.
- A interface não oferece arquivamento de atividades, embora a API e a serialização já aceitem o campo.
- Categoria é texto livre, sem normalização além de trim.
- A listagem carrega todos os logs e registros quantitativos para calcular estatísticas.
- Unidades personalizadas nunca são convertidas entre si ou para unidades padrão.
- Próximos passos sugeridos: exportação, filtros por categoria, ação de arquivamento na UI, revisão periódica e exportação do histórico.
