# ADR-012 — Catálogo local de mídia com eventos de consumo

- Data: 2026-10-22
- Status: Aceita

## Contexto

A Elisa não tinha um lugar para acompanhar o que o usuário consome em animes, séries, filmes, livros, mangás, jogos, cursos, podcasts e formatos semelhantes. O requisito incluía catálogo pesquisável, progresso, histórico de consumo e estatísticas de quantidade e tempo, tudo local-first e sem integrações externas obrigatórias.

## Problema

Como modelar um acervo heterogêneo, com unidades e durações diferentes, sem inventar dados e sem transformar o módulo em um clone de serviços de catalogação online?

## Alternativas consideradas

1. **Uma tabela por tipo de mídia.** Facilitaria campos específicos, mas multiplicaria CRUD, filtros e estatísticas e dificultaria tipos personalizados.
2. **Integração com uma API externa de metadados.** Traria capas e sinopses, porém exigiria rede, chaves, termos de uso e envio de dados, contrariando o padrão local-first.
3. **Catálogo único com tipos configuráveis e eventos independentes.** Mantém um contrato comum, permite tipos personalizados e separa o item do histórico de consumo.

## Decisão

Adotar a alternativa 3:

- `media_types` define tipos com `default_unit`, `unit_label` e um conjunto de unidades aceitas. Doze tipos padrão são semeados de forma idempotente; tipos personalizados reutilizam o mesmo contrato.
- `media_genres` e `media_item_genres` formam um catálogo de gêneros reutilizável, criado sob demanda.
- `media_items` guarda título, título alternativo, descrição, ano, criador, totais, durações conhecidas, rótulo de unidade, avaliação, estado, datas de início/fim, arquivamento, observações e um progresso manual opcional.
- `media_consumption_events` guarda consumos independentes com data local, quantidade, unidade, duração real opcional, observação e marca de revisita.
- O progresso usa a unidade padrão do tipo e soma apenas eventos que não são revisitas. Um `progress_override` substitui o progresso calculado, sem apagar o consumo registrado.
- Revisitas somam nas quantidades consumidas, mas não avançam o progresso da obra.
- O tempo é classificado como **real** (duração informada ou consumo em minutos/horas), **estimado** (quantidade × duração média/total conhecida do item) ou **desconhecido**. Estimativas nunca são apresentadas como tempo real.
- Obras concluídas são contadas por estado do item, uma única vez, independentemente do número de eventos.
- A API oferece filtros por busca, tipo, estado, gênero, arquivamento e ordenação, além de estatísticas por período, tipo, gênero e mês.

## Justificativa

Um catálogo único com eventos separados reflete o domínio: a obra e o que foi consumido são coisas distintas, e o mesmo item pode ter vários consumos, inclusive revisitas. Tipos configuráveis cobrem formatos diferentes sem criar tabelas específicas. A separação entre tempo real, estimado e desconhecido mantém a honestidade dos números. Nenhum metadado externo é presumido: capas, sinopses e durações só existem quando o usuário informa.

## Consequências e limitações

- Não há importação de serviços externos, capas, sinopses automáticas ou busca online.
- A duração estimada depende de `average_duration_minutes` ou `total_duration_minutes` informados no item; sem eles, o evento fica como desconhecido.
- Unidades de mídia não são convertidas entre si (episódio, página, capítulo, hora etc.); cada unidade é agregada separadamente.
- O estado do item não muda automaticamente ao registrar consumo; a mudança é manual.
- Não há acompanhamento episódio a episódio, temporadas, edições ou coleções.
- Estatísticas por tipo e gênero refletem o catálogo filtrado; quantidades, tempo e eventos refletem o período consultado.
- A listagem e as estatísticas carregam itens e eventos em memória no volume pessoal atual; deve ser revisto se o acervo crescer muito.
