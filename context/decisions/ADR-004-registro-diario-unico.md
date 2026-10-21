# ADR-004 — Um registro por atividade e dia

- Data: 2026-10-21
- Status: Aceita

## Contexto

A grade de contribuições representa dias concluídos. O usuário pode registrar ou desfazer um dia.

## Problema

Como modelar conclusões diárias sem ambiguidade para sequências e histórico?

## Alternativas consideradas

1. Vários registros por dia (quantidade, notas, múltiplas sessões).
2. Um registro binário por atividade e dia, com restrição única.
3. Contadores agregados sem registro individual.

## Decisão

Um registro binário por `(activity_id, date)`, garantido por restrição única. Datas futuras são rejeitadas. A conclusão é registrada ou removida por inteiro.

## Justificativa

- Modelo simples e consistente com a grade.
- Sequências e totais são calculados sem ambiguidade.
- Unicidade no banco evita duplicidade mesmo em requisições concorrentes.
- Datas futuras não poluem estatísticas nem são apresentadas como falhas.

## Consequências e limitações

- Não há quantidade, duração ou anotações por dia.
- Funcionalidades futuras de quantidade exigiriam extensão do modelo (novo campo ou tabela) e migração.
- A data é local (`YYYY-MM-DD`), sem hora; timestamps de criação são UTC.
