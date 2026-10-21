# Módulo — Diário

**Status:** concluído na v0.1.0
**Rota:** `/diario`
**API:** `/api/diary`, `/api/diary/:id`, `/api/diary/reindex`

## Responsabilidade

Oferecer escrita livre em um espaço pessoal, sem formulários rígidos ou análise automática. Cada registro é um arquivo Markdown do usuário, legível fora da Elisa. O módulo não implementa IA, análise emocional, lembretes ou o futuro módulo Conhecimento.

## Persistência

A fonte canônica são arquivos Markdown em `data/diary/AAAA/MM/<id>-<slug>.md`; o SQLite é apenas um índice auxiliar. A decisão completa está em [ADR-009](../decisions/ADR-009-markdown-canonico-indice-sqlite.md).

### Arquivo Markdown

```markdown
---
id: 0f5c2b1e8d4a4f6b9c7e2a1d3b4c5e6f
title: Um dia comum
created_at: 2026-10-21T17:05:00-03:00
updated_at: 2026-10-21T17:05:00-03:00
tags:
- pessoal
- ideias
---

Hoje escrevi sobre o dia.
```

- `id`: UUID hexadecimal de 32 caracteres, também usado na URL.
- `created_at` / `updated_at`: ISO 8601 com fuso local preservado no arquivo.
- `tags`: lista YAML; a API devolve em `camelCase`.
- O slug deriva do título no momento da criação e não muda em edições posteriores.
- O corpo é preservado integralmente; a API normaliza apenas quebras de linha `\r\n` para `\n`.

### Índice `diary_entries`

| Campo | Tipo | Uso |
| --- | --- | --- |
| `id` | texto (32) | PK, mesmo ID do arquivo |
| `file_path` | texto, único | caminho relativo dentro de `DIARY_DIR` |
| `title` | texto (160) | ordenação e apoio; não substitui o arquivo |
| `entry_date` | data | filtro por mês/intervalo |
| `created_at` | datetime UTC | ordenação |
| `updated_at` | datetime UTC | metadado |
| `tags_json` | texto | metadados auxiliares; busca lê o arquivo |

O corpo nunca é armazenado no banco. Se o banco estiver vazio e houver arquivos, a listagem dispara uma reindexação automática. `POST /api/diary/reindex` reindexa manualmente e informa `indexed`, `skipped` e `errors`; arquivos malformados não são apagados.

## Regras de negócio

- Título opcional, até 160 caracteres; espaços nas pontas são removidos.
- Conteúdo obrigatório, até 100.000 caracteres, sem perder o texto original.
- Até 10 etiquetas, cada uma com até 30 caracteres; duplicatas são removidas sem diferenciar maiúsculas.
- Busca de até 200 caracteres em título, conteúdo e etiquetas, sem diferenciar maiúsculas.
- Paginação por `limit` (1–100, padrão 20) e `offset`; `hasMore` indica se há mais resultados.
- Filtro por `month=AAAA-MM` ou por intervalo `start` / `end` (`AAAA-MM-DD`).
- Registros são ordenados do mais recente para o mais antigo.
- IDs inválidos ou inexistentes retornam 404.
- Falhas de escrita ou leitura de arquivo retornam `storage_error` (500) sem apagar conteúdo existente.
- Escrita atômica com temporário + `os.replace`; caminhos são resolvidos e confinados em `DIARY_DIR`.
- A API serializa timestamps em UTC com sufixo `Z`; a interface converte para o horário local.

## API

### Listar

`GET /api/diary?query=&month=&start=&end=&limit=&offset=`

```json
{
  "entries": [
    {
      "id": "0f5c2b1e8d4a4f6b9c7e2a1d3b4c5e6f",
      "title": "Um dia comum",
      "tags": ["pessoal"],
      "createdAt": "2026-10-21T20:05:00Z",
      "updatedAt": "2026-10-21T20:05:00Z",
      "excerpt": "Hoje escrevi sobre o dia."
    }
  ],
  "hasMore": false,
  "limit": 50,
  "offset": 0
}
```

`excerpt` é limitado a 180 caracteres e não inclui o corpo completo.

### Criar

`POST /api/diary`

```json
{
  "title": "Um dia comum",
  "content": "Hoje escrevi sobre o dia.",
  "tags": ["pessoal", "ideias"]
}
```

Resposta `201` com `{ "entry": { ..., "content": "..." } }`.

### Detalhe

`GET /api/diary/:id` → `200` com `{ "entry": { ..., "content": "..." } }`.

### Atualizar

`PATCH /api/diary/:id` aceita `title`, `content` e/ou `tags`. `createdAt` e o caminho do arquivo são preservados; `updatedAt` é renovado. Resposta `200`.

### Excluir

`DELETE /api/diary/:id` remove o arquivo e a linha do índice; resposta `204`.

### Reindexar

`POST /api/diary/reindex`

```json
{
  "indexed": 12,
  "skipped": 1,
  "errors": [
    { "file": "2026/10/arquivo-quebrado.md", "message": "Frontmatter ausente." }
  ]
}
```

## Interface

### Diário (`/diario`)

- Cabeçalho com identificação de armazenamento local em Markdown.
- Compositor com título opcional, texto livre, contador de caracteres e etiquetas separadas por vírgula.
- Lista agrupada por data (`Hoje`, `Ontem`, data por extenso), com hora, excerpt e até três etiquetas.
- Busca com debounce de 300 ms por título, conteúdo e etiquetas.
- Filtro por mês refletido em `?month=AAAA-MM`; limpeza de filtros.
- Lista limitada aos 50 registros mais recentes; quando há mais, a interface orienta refinar a busca.
- Leitura em diálogo com ações de editar e excluir.
- Edição em diálogo com proteção contra perda de alterações não salvas.
- Exclusão com confirmação explícita e aviso de remoção do arquivo.
- Estados de carregamento, erro, vazio, busca sem resultados e falha de salvamento preservando o texto digitado.
- Toasts após criar, atualizar e excluir.

### Início (`/`)

- Card do Diário ativo, com atalho para `/diario`.
- Conhecimento permanece planejado, sem simulação.

## Arquivos

### Frontend

- `src/features/diary/pages/DiaryPage.tsx`
- `src/features/diary/components/DiaryComposer.tsx`
- `src/features/diary/components/DiaryEntryList.tsx`
- `src/features/diary/components/DiaryEntryDialog.tsx`
- `src/features/diary/components/DiaryEditorDialog.tsx`
- `src/features/diary/components/DeleteDiaryEntryDialog.tsx`
- `src/features/diary/types.ts`
- `src/services/diary.ts`
- `src/lib/diary.ts`, `src/lib/diaryValidation.ts`
- `src/hooks/useDebouncedValue.ts`

### Backend

- `app/api/diary.py`
- `app/services/diary_service.py`
- `app/repositories/diary_repository.py`
- `app/repositories/diary_file_store.py`
- `app/models/diary.py`
- `app/api/serializers.py`
- `app/core/config.py` (`DIARY_DIR`)
- `backend/migrations/versions/fe63aca33060_diary_entries_index.py`

## Testes

Backend (`backend/tests/test_diary.py`, 15 testes):

- criação de arquivo Markdown e índice;
- título e etiquetas opcionais preservando o corpo;
- leitura e atualização preservando `createdAt`;
- exclusão de arquivo e índice;
- busca por título e conteúdo sem diferenciar maiúsculas;
- filtro por mês e intervalo;
- paginação e validação de filtros;
- validação de campos e corpo ausente;
- IDs inválidos e inexistentes;
- reindexação, arquivo malformado preservado e reindexação automática;
- rejeição de caminhos arbitrários;
- falha de escrita preservando o arquivo original;
- persistência após reinício e reconstrução após perda do banco.

Frontend (10 testes):

- compositor: envio válido, bloqueio de vazio e preservação do texto em erro;
- editor: salvamento e confirmação de descarte;
- lista: agrupamento, abertura, busca sem resultados e erro com nova tentativa;
- página: mês vindo da URL, criação e confirmação por toast.

## Limitações e evolução

- A busca textual percorre os arquivos; não há índice full-text.
- Edições manuais de metadados só entram no índice após reindexação.
- Não há editor Markdown rico, anexos, imagens ou vínculos entre registros.
- Não há criptografia em repouso; a proteção é o acesso local ao sistema de arquivos.
- O backup do SQLite não inclui `data/diary/`; copie a pasta separadamente.
- Próximos passos possíveis: exportação, vínculos com Conhecimento, busca full-text e backup integrado dos arquivos.
