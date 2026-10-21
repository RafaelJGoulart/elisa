# ADR-001 — Monólito modular local-first

- Data: 2026-10-21
- Status: Aceita

## Contexto

Elisa é um ambiente pessoal de usuário único, executado na própria máquina, que deve crescer por módulos ao longo de anos.

## Problema

Como organizar a aplicação para permitir evolução modular sem introduzir infraestrutura desproporcional?

## Alternativas consideradas

1. Microserviços ou serviços separados por módulo.
2. Frontend e backend em repositórios distintos.
3. Monólito modular com fronteiras internas claras.

## Decisão

Adotar um monólito modular: um frontend React e um backend Flask, com módulos organizados por funcionalidade e camadas explícitas (API, service, repository, model).

## Justificativa

- Implantação e operação simples em uma máquina pessoal.
- Sem latência de rede entre serviços, sem filas, Redis ou orquestração.
- Fronteiras internas bem documentadas permitem extrair algo no futuro, se necessário.
- Menor custo de manutenção para um único desenvolvedor.

## Consequências e limitações

- Disciplina manual para não vazar SQL para rotas nem regra para componentes.
- Não há isolamento de processo entre módulos.
- Se um módulo exigir execução isolada (por exemplo, IA local), ele pode ser adicionado como processo separado com contrato explícito, sem reescrever o núcleo.
