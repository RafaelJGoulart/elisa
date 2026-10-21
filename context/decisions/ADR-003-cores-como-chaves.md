# ADR-003 — Cores como chaves de paleta

- Data: 2026-10-21
- Status: Aceita

## Contexto

Cada atividade tem uma cor de destaque. A paleta é um token do design system e pode ser ajustada por contraste ou identidade.

## Problema

Persistir a cor como hexadecimal ou como identificador semântico?

## Alternativas consideradas

1. Salvar hexadecimal (`#8B5CF6`) no banco.
2. Salvar uma chave (`purple`) validada contra a paleta.
3. Salvar um índice numérico.

## Decisão

Persistir a chave semântica da paleta. O backend valida contra o conjunto `purple`, `magenta`, `red`, `green`, `blue`, `yellow`, `orange`. O frontend resolve a chave para o hexadecimal em `lib/colors.ts`.

## Justificativa

- Trocar um tom no design system atualiza todos os registros sem migração.
- Evita valores arbitrários e inconsistência visual.
- Facilita acessibilidade e temas futuros.
- O contrato é legível e estável.

## Consequências e limitações

- A paleta precisa existir nos dois lados; hoje há duplicação controlada em CSS e em `lib/colors.ts`.
- Adicionar uma cor exige atualizar o conjunto do backend, o frontend, o CSS e a documentação.
- Não é possível usar uma cor personalizada fora da paleta nesta versão.
