# Módulo — Mídia

**Status:** concluído na v0.2.0
**Rotas:** `/midia`, `/midia/estatisticas`, `/midia/:id`
**API:** `/api/media`, `/api/media/items`, `/api/media/events`, `/api/media/stats`

## Responsabilidade

Manter um acervo pessoal de mídias consumidas ou planejadas, com tipos configuráveis, gêneros, estado, progresso, eventos independentes de consumo e estatísticas de quantidade e tempo. O módulo é local-first: não consulta serviços externos, não baixa capas e não inventa metadados.

## Modelo de dados

### `media_types`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `code` | texto | único e estável |
| `name` | texto | até 60 caracteres |
| `default_unit` | texto | unidade usada no progresso |
| `unit_label` | texto | rótulo plural exibido |
| `is_system` | booleano | identifica tipo semeado |
| `created_at` | datetime UTC | automático |

Tipos padrão semeados: anime, série, filme, livro, mangá, quadrinho/HQ, light novel, jogo, documentário, curso, podcast e outro. `media_service.ensure_default_types()` garante o catálogo de forma idempotente em bancos criados por testes.

Unidades aceitas por tipo:

| Tipo | Unidades |
| --- | --- |
| Anime, série, podcast | episódio, minuto, hora |
| Filme | filme, minuto |
| Documentário | documentário, minuto |
| Livro, light novel | página, capítulo, minuto |
| Mangá, quadrinho | capítulo, volume, página, minuto |
| Jogo | hora, minuto |
| Curso | aula, minuto, hora |
| Outro / tipo personalizado | unidade, episódio, página, capítulo, filme, aula, hora, minuto |

O serializer de `MediaType` inclui `units`, para a interface não reimplementar a compatibilidade.

### `media_genres` e `media_item_genres`

- `media_genres`: `id`, `name` único (até 40 caracteres) e `created_at`.
- `media_item_genres`: associação N:N com cascata nos dois lados.
- Gêneros são criados sob demanda, sem diferenciar maiúsculas na deduplicação; cada item aceita até 10.

### `media_items`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `media_type_id` | inteiro | FK `media_types.id`, `RESTRICT` |
| `title` | texto | 1–200, obrigatório |
| `alternate_title` | texto | até 200 |
| `description` | texto | até 2.000 |
| `release_year` | inteiro | 1–3000 |
| `creator` | texto | até 160 |
| `total_units` | inteiro | total conhecido na unidade padrão |
| `total_volumes` | inteiro | total de volumes, quando aplicável |
| `average_duration_minutes` | inteiro | duração média por episódio/aula/capítulo/unidade |
| `total_duration_minutes` | inteiro | duração total de filme/documentário |
| `unit_label` | texto | até 30; sobrescreve o rótulo do tipo quando a unidade é `unit` |
| `rating` | inteiro | 1–5 |
| `notes` | texto | até 2.000 |
| `status` | texto | `want`, `in_progress`, `completed`, `paused` ou `dropped` |
| `started_on` / `finished_on` | data | `YYYY-MM-DD`; início não pode ser posterior ao fim |
| `archived` | booleano | oculta do acervo por padrão |
| `progress_override` | decimal | progresso manual, não negativo |
| `created_at` / `updated_at` | datetime UTC | automático |

Restrição única `(media_type_id, title)`. Duplicar título no mesmo tipo retorna 409; versões diferentes devem ser diferenciadas no título.

### `media_consumption_events`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `media_item_id` | inteiro | FK `media_items.id`, cascade |
| `consumed_on` | data | `YYYY-MM-DD`, não futura |
| `amount` | decimal | maior que zero, até 3 casas decimais |
| `unit` | texto | precisa ser aceita pelo tipo do item |
| `duration_minutes` | decimal | tempo real informado, mínimo 0,01 |
| `note` | texto | até 500 |
| `is_repeat` | booleano | revisita |
| `created_at` / `updated_at` | datetime UTC | automático |

Eventos são independentes: o mesmo item pode ter vários consumos no mesmo dia e em dias diferentes. Excluir o item remove os eventos em cascata.

## Regras de negócio

### Acervo e tipos

- Busca por título, título alternativo ou criador, sem diferenciar maiúsculas.
- Filtros por tipo, estado, gênero e arquivamento; ordenação por atividade recente, título, criação, avaliação ou ano.
- Paginação por `limit` (1–100, padrão 24) e `offset`; `total` reflete o filtro.
- Tipos personalizados usam `custom-<slug>` e exigem uma unidade padrão do conjunto permitido.
- Trocar o tipo de um item é bloqueado se algum evento já registrado usar unidade que o novo tipo não aceita.
- O estado é manual; registrar consumo não altera `status` automaticamente.

### Progresso

- O progresso usa a unidade padrão do tipo e soma eventos **não repetidos** dessa unidade.
- Eventos em outras unidades entram em `consumed`, mas não no progresso.
- `progress_override`, quando presente, substitui o valor calculado em `current`; o consumo original continua disponível em `consumed`.
- `percent` existe apenas quando `total_units` é conhecido e maior que zero.
- `progressOverride` não pode ultrapassar `totalUnits` quando o total é conhecido.
- Revisitas (`isRepeat`) somam nas quantidades consumidas, mas não avançam o progresso.

### Tempo

Cada evento recebe uma classificação honesta:

| Classificação | Quando ocorre |
| --- | --- |
| `real` | `durationMinutes` informado; ou consumo em `minute` (o valor é o tempo); ou consumo em `hour` (valor × 60). |
| `estimated` | Sem duração real, mas com `averageDurationMinutes` para episódio/aula/capítulo/unidade, ou `totalDurationMinutes` para filme/documentário. |
| `unknown` | Sem duração real e sem duração conhecida compatível. |

O serializer inclui `timeKind`, `estimatedMinutes` e `knownMinutes`. Estimativas nunca são somadas ao tempo real; o resumo expõe `realMinutes`, `estimatedMinutes`, `unknownEvents` e `totalKnownMinutes` separadamente.

### Estatísticas

`GET /api/media/stats` devolve:

- `filters`: período e filtros aplicados;
- `totals`: itens, obras concluídas (contadas uma vez por estado), em andamento, pausadas, abandonadas, desejadas, arquivadas e eventos;
- `quantities`: soma por unidade, sem conversão entre unidades diferentes;
- `time`: tempo real, estimado, eventos desconhecidos e total conhecido;
- `byType` e `byGenre`: contagem de itens e concluídos por tipo, e itens por gênero;
- `months`: eventos, quantidades e tempo por mês do período, incluindo meses sem eventos;
- `recentEvents`: até 10 eventos recentes.

O período padrão, quando omitido, começa no primeiro dia do mês cerca de 11 meses antes do fim; o máximo é 3.650 dias. A interface usa 30, 90, 180 ou 365 dias.

## API

Prefixo `/api/media`.

### Tipos e gêneros

- `GET /types` → `{ "types": [ ... ] }`, cada tipo com `units`.
- `POST /types` com `{ "name", "defaultUnit", "unitLabel" }` → `201`.
- `GET /genres` → `{ "genres": [ { "id", "name" } ] }`.

### Itens

- `GET /items?query=&type=&status=&genre=&sort=&limit=&offset=&includeArchived=` → `{ items, total, limit, offset }`.
- `POST /items` cria o item e devolve `201` com agregados.
- `GET /items/:id` devolve o item com agregados e `events`.
- `PATCH /items/:id` atualiza campos parciais e devolve o item com eventos.
- `DELETE /items/:id` → `204`, removendo os eventos em cascata.

Exemplo de criação:

```json
{
  "typeId": 4,
  "title": "O nome do vento",
  "alternateTitle": "The Name of the Wind",
  "creator": "Patrick Rothfuss",
  "releaseYear": 2007,
  "genres": ["Fantasia"],
  "totalUnits": 662,
  "status": "in_progress",
  "startedOn": "2026-10-01",
  "averageDurationMinutes": null,
  "totalDurationMinutes": null
}
```

O serializer do item inclui:

```json
{
  "progress": {
    "unit": "page",
    "label": "páginas",
    "consumed": 120,
    "override": null,
    "current": 120,
    "total": 662,
    "percent": 18.13
  },
  "consumed": [{ "unit": "page", "label": "páginas", "amount": 120 }],
  "time": {
    "realMinutes": 0,
    "estimatedMinutes": 0,
    "unknownEvents": 3,
    "totalKnownMinutes": 0
  },
  "eventCount": 3,
  "repeatCount": 0,
  "lastConsumedOn": "2026-10-22"
}
```

### Eventos

- `GET /items/:id/events` → `{ events }`.
- `POST /items/:id/events` com `{ date, amount, unit, durationMinutes, note, isRepeat }` → `201` com `event` e `item` atualizado.
- `GET /events?start=&end=&type=&genre=&limit=&offset=` → feed com `events` e `total`.
- `PATCH /events/:eventId` aceita os mesmos campos, parciais → `200` com `event` e `item`.
- `DELETE /events/:eventId` → `204`.

`date` é uma data local `YYYY-MM-DD`; `createdAt` e `updatedAt` são UTC com `Z`. Cada evento inclui `unitLabel`, `timeKind`, `estimatedMinutes` e `knownMinutes`; no feed, inclui também `item` com título e tipo.

### Estatísticas

`GET /stats?start=2026-01-01&end=2026-10-22&type=book&genre=Fantasia` → `{ "stats": { ... } }`.

## Interface

### Acervo (`/midia`)

- Cabeçalho com acesso às estatísticas e criação de mídia.
- Busca com debounce de 300 ms por título, título alternativo ou criador.
- Filtros por tipo, estado, gênero, ordenação e arquivamento.
- Grade de cards com tipo, título, estado, capa ausente (não simulada), progresso, consumo, tempo conhecido e último consumo quando existirem.
- Paginação de 12 itens, com indicação do intervalo exibido.
- Criação e edição em diálogo com tipo, títulos, criador, ano, gêneros, totais, durações conhecidas, avaliação, estado, datas, progresso manual, observações e arquivamento.
- Exclusão com confirmação e aviso de remoção dos consumos.

### Detalhe (`/midia/:id`)

- Cabeçalho com tipo, estado, título, título alternativo, criador, ano, avaliação, gêneros e marca de arquivamento.
- Ações: registrar consumo, editar item e excluir.
- Barra de progresso com unidade e total conhecido, ou consumo acumulado quando não há total.
- Resumo de consumo por unidade e de tempo real/estimado/desconhecido.
- Histórico de eventos em ordem decrescente, com data, quantidade, unidade, tempo, revisita, observação, editar e excluir.
- Edição do item e dos eventos em diálogos separados.

### Estatísticas (`/midia/estatisticas`)

- Período de 30, 90, 180 ou 365 dias, com filtros de tipo e gênero.
- Cartões de itens, concluídos, em andamento, eventos, arquivados e tempo conhecido.
- Consumo por unidade e distribuição por tipo e gênero.
- Histórico mensal com eventos, quantidades, tempo real, tempo estimado e eventos sem tempo.
- Lista de consumos recentes.
- Estado vazio honesto quando não há itens nem eventos.

## Arquivos

### Frontend

- `src/features/media/pages/MediaPage.tsx`
- `src/features/media/pages/MediaDetailPage.tsx`
- `src/features/media/pages/MediaStatsPage.tsx`
- `src/features/media/components/MediaCard.tsx`
- `src/features/media/components/MediaBadges.tsx`
- `src/features/media/components/MediaConfirmDialog.tsx`
- `src/features/media/components/MediaEventDialog.tsx`
- `src/features/media/components/MediaItemDialog.tsx`
- `src/features/media/components/MediaProgressBar.tsx`
- `src/features/media/types.ts`
- `src/lib/media.ts`, `src/lib/format.ts`
- `src/services/media.ts`

### Backend

- `app/api/media.py`
- `app/api/serializers.py`
- `app/services/media_service.py`
- `app/repositories/media_repository.py`
- `app/models/media.py`
- `backend/migrations/versions/3c75e125a588_measurable_habits_and_media_tracker.py`

## Testes

Backend (`backend/tests/test_media.py`, 14 testes):

- tipos padrão e tipo personalizado;
- criação e filtros por busca, tipo, estado e gênero;
- duplicidade de título no mesmo tipo;
- eventos atualizando progresso e consumo;
- progresso manual separado do consumo;
- distinção entre tempo real e estimado;
- tempo desconhecido sem invenção;
- obras concluídas contadas uma vez;
- revisitas sem avanço de progresso;
- estatísticas por período, tipo e gênero;
- feed cronológico e filtrado;
- validação de regras;
- exclusão em cascata;
- persistência entre instâncias da aplicação.

Frontend:

- utilitários de mídia (rótulos, ícones e opções de unidade);
- diálogo de consumo: registro válido, unidade e erros.

## Limitações e evolução

- Não há capas, imagens, sinopses automáticas ou integração com APIs externas.
- Não há temporadas, episódios individualizados, edições ou coleções.
- O estado não muda automaticamente ao registrar consumo.
- Unidades diferentes não são convertidas; cada uma é agregada separadamente.
- Tempo só é estimado quando o item tem duração média ou total conhecida e compatível.
- Não há exportação/importação, metas de leitura, recomendações ou compartilhamento.
- A listagem e as estatísticas carregam itens e eventos em memória no volume pessoal atual.
- Próximos passos possíveis: importação/exportação, capas locais, acompanhamento por temporada e metas de consumo.
