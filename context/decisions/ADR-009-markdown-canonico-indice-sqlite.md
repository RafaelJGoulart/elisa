# ADR-009 — Markdown canônico e índice SQLite reconstruível

- Data: 2026-10-21
- Status: Aceita

## Contexto

O Diário guarda texto pessoal livre que deve continuar legível e portátil fora da Elisa. Ao mesmo tempo, listar e buscar registros precisa ser rápido e integrar-se ao restante do produto, que usa SQLite.

## Problema

Onde persistir registros de Diário sem transformar o banco em um cofre opaco e sem duplicar o texto em duas fontes que possam divergir?

## Alternativas consideradas

1. Guardar o corpo apenas em uma tabela SQLite.
2. Guardar apenas arquivos Markdown e varrer o diretório em toda listagem.
3. Usar arquivos Markdown como fonte canônica e um índice SQLite apenas com metadados.

## Decisão

Adotar a alternativa 3:

- Cada registro é um arquivo Markdown em `data/diary/AAAA/MM/<id>-<slug>.md`.
- O `id` é um UUID hexadecimal de 32 caracteres; o slug é gerado a partir do título e não muda quando o título é editado.
- O arquivo tem frontmatter YAML com `id`, `title`, `created_at`, `updated_at` e `tags`; o corpo é o texto integral.
- Timestamps no frontmatter preservam o fuso local do momento da escrita.
- O índice SQLite `diary_entries` guarda apenas `id`, caminho relativo, título, data local, timestamps UTC e etiquetas serializadas. O corpo nunca é copiado para o banco.
- Detalhe, listagem, busca e excerpt leem o arquivo; o índice serve para ordenar, filtrar por data e localizar arquivos.
- `POST /api/diary/reindex` reconstrói o índice a partir dos arquivos. Arquivos malformados são reportados e preservados, nunca apagados automaticamente.
- Escritas usam arquivo temporário no mesmo diretório, `fsync` e `os.replace`.
- Caminhos de arquivo nunca vêm do cliente; IDs são validados por `^[0-9a-f]{32}$` e todo caminho resolvido precisa permanecer dentro de `DIARY_DIR`.

## Justificativa

- O texto continua legível, editável e portátil em qualquer editor Markdown.
- O banco pode ser perdido e reconstruído a partir dos arquivos.
- Não existe cópia independente do corpo que possa divergir.
- Metadados no SQLite evitam varrer todos os arquivos para ordenar e filtrar por data.
- A escrita atômica reduz o risco de arquivo truncado em falhas.

## Consequências e limitações

- A busca textual lê os arquivos candidatos; aceitável no volume pessoal atual.
- Edições externas nos arquivos exigem reindexação para refletir mudanças de metadados; título, conteúdo e etiquetas já aparecem ao abrir o arquivo, mas ordenação e filtro usam o índice.
- O índice pode ficar temporariamente desatualizado em relação a edições manuais.
- Backups precisam incluir `data/diary/`; o backup do SQLite isoladamente não preserva o Diário.
- O caminho de um registro permanece com o slug original mesmo após renomear o título.
