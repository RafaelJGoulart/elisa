# ADR-015 — Separação entre validação, estatísticas e orquestração de Atividades

- Data: 2026-10-22
- Status: Aceita

## Contexto

O módulo de Atividades cresceu para dois modelos de hábito, cálculo de sequências, conversão de unidades, validação de payloads, leitura de histórico e integração com EXP. O serviço concentrava todas essas responsabilidades em um único arquivo, dificultando localizar regras e testar cálculo puro sem atravessar orquestração.

## Problema

Como manter a fachada existente do módulo e os contratos da API sem deixar validação, estatísticas e transações acopladas no mesmo arquivo?

## Alternativas consideradas

1. **Manter tudo em `activity_service.py`.** Evita mudanças, mas agrava o acúmulo de responsabilidades e aumenta o custo de manutenção.
2. **Dividir por tipo de hábito.** Duplicaria regras comuns e criaria dois fluxos de validação e estatística.
3. **Separar por responsabilidade (escolhida).** Validação, cálculo e orquestração passam a ter fronteiras explícitas, preservando uma fachada única.

## Decisão

- `activity_validation.py` concentra validação de payloads, datas e regras que dependem de unidades ou registros existentes.
- `activity_stats.py` concentra modelos e cálculos de estatísticas, sequências e limites de período, sem acesso a repositories.
- `activity_service.py` permanece como fachada do módulo e concentra CRUD, transações, leituras agregadas e sincronização de EXP.
- Os nomes públicos usados por outras camadas continuam disponíveis na fachada; consumidores internos importam diretamente o módulo responsável.
- Nenhum contrato JSON, rota, tabela ou regra de negócio muda nesta separação.

## Justificativa

A divisão reduz acoplamento, deixa cálculo puro independente de persistência e torna explícito onde cada tipo de regra vive. A fachada preserva compatibilidade e evita que a API conheça detalhes da organização interna.

## Consequências e limitações

- A validação ainda consulta o repository para regras que dependem do estado persistido, como compatibilidade de unidade. Ela não inicia transações nem faz commit.
- O cálculo de estatísticas recebe atividades e registros já carregados; a orquestração continua responsável por buscar os dados.
- Futuras extrações devem manter a mesma direção de dependência: API → fachada → validação/estatísticas → repositories/models.
