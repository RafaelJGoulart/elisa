# ADR-006 — Formulários com estado controlado e Zod

- Data: 2026-10-21
- Status: Aceita

## Contexto

Os formulários atuais têm poucos campos (nome, categoria, descrição e cor) e validação simples. A solução deve ser adequada à complexidade, sem dependências redundantes.

## Problema

Qual estratégia de gerenciamento de formulários e validação adotar?

## Alternativas consideradas

1. React Hook Form + `@hookform/resolvers` + Zod.
2. Estado controlado com `useState` + validação Zod.
3. Apenas validação do backend.

## Decisão

Usar estado controlado e Zod no cliente, com validação equivalente no backend. Não adotar React Hook Form nesta fase.

## Justificativa

- Formulários pequenos não justificam uma camada de gerenciamento.
- Zod já fornece mensagens e parsing consistentes.
- Evita conflito de peer dependencies observado entre `@hookform/resolvers` e o ecossistema atual.
- Mantém o bundle e o código menores.

## Consequências e limitações

- Formulários grandes ou dinâmicos exigirão reavaliação.
- O backend continua sendo a fonte de verdade; a validação do cliente é conveniência.
- Mensagens de erro do servidor são mapeadas para os campos quando retornadas em `details.fields`.
