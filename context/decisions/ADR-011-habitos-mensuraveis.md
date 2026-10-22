# ADR-011 — Hábitos mensuráveis sobre a entidade de atividades

- Data: 2026-10-22
- Status: Aceita

## Contexto

O módulo de Atividades nasceu com um modelo binário: uma atividade tem no máximo um registro de conclusão por dia. Isso atende hábitos como "ler" ou "meditar", mas não permite acompanhar quantidades, metas e frequências diferentes de diária.

A evolução precisava preservar integralmente as atividades e os registros existentes, continuar usando SQLite e migrações Alembic e manter a interface atual como base.

## Problema

Como representar hábitos com quantidade, unidade de medida, meta opcional e frequência diária, semanal ou mensal sem duplicar o conceito de atividade nem quebrar registros binários?

## Alternativas consideradas

1. **Tabelas separadas para hábitos mensuráveis.** Isolaria o novo modelo, mas duplicaria categoria, cor, histórico, listagem e resumo de hoje, além de dividir a navegação em duas entidades parecidas.
2. **Uma única tabela genérica de registros com quantidade opcional.** Reduziria tabelas, porém misturaria conclusão binária e medição, dificultando restrições e consultas de sequência.
3. **Estender `activities` e criar registros quantitativos próprios.** Mantém uma única entidade de hábito, preserva o comportamento binário e permite regras explícitas por tipo.

## Decisão

Adotar a alternativa 3:

- `activities` recebe `kind` (`binary` ou `measurable`), `unit_id`, `target_amount`, `frequency` (`daily`, `weekly`, `monthly`) e `archived`.
- `measurement_units` guarda unidades com `dimension` e `factor`. Apenas unidades da mesma dimensão são conversíveis; unidades personalizadas recebem dimensão própria e nunca são somadas a outra grandeza.
- `activity_progress_entries` guarda registros quantitativos com data local, quantidade, unidade original, observação e timestamps. Vários registros podem existir no mesmo dia.
- A quantidade é armazenada na unidade escolhida no momento do registro. A conversão para a unidade do hábito acontece somente na agregação, preservando o histórico original.
- Metas e sequências são avaliadas no período da frequência: dia, semana (domingo a sábado) ou mês.
- Sem meta, um período é considerado cumprido quando há quantidade registrada maior que zero; com meta, quando a soma convertida atinge o valor.
- Hábitos binários continuam com no máximo um registro por dia e frequência diária.
- A troca de tipo é bloqueada enquanto existirem registros incompatíveis; a troca entre unidades compatíveis converte a meta existente.
- A listagem e o resumo de hoje incluem estatísticas derivadas dos registros, sem gravar totais redundantes.

## Justificativa

Uma única entidade mantém a experiência e o domínio coesos: cor, categoria, arquivamento, histórico, detalhe e resumo de hoje funcionam para os dois tipos. Registros independentes representam fielmente múltiplas medições no mesmo dia e evitam perda de informação quando o usuário registra em unidades diferentes. A separação entre unidade original e unidade de agregação torna a conversão auditável e restrita a grandezas compatíveis.

## Consequências e limitações

- O modelo de atividades ficou mais amplo; toda leitura precisa considerar `kind`.
- A conversão depende de `dimension` e `factor`; não há conversão entre grandezas diferentes nem entre unidades personalizadas.
- Metas não são obrigatórias e não há notificações, lembretes ou criação automática de registros.
- A listagem carrega todos os registros quantitativos para calcular estatísticas; é aceitável no volume pessoal atual, mas deve ser revisto se crescer.
- O campo `archived` existe na API e na serialização; a interface ainda não oferece uma ação dedicada para arquivar atividades.
- Migrações futuras em `activities` precisam preservar `activity_logs` e `activity_progress_entries`; no SQLite, recriações em lote exigem atenção às foreign keys.
