# ADR-013 — EXP centralizado em extrato de eventos

- Data: 2026-10-22
- Status: Aceita

## Contexto

A Elisa já registra hábitos binários e mensuráveis, com dados históricos que precisam continuar válidos. A nova experiência de perfil precisa de EXP, níveis e um extrato recente sem duplicar regras dentro de Atividades, Mídia, Diário ou Projetos. Também é necessário desfazer concessões quando um registro é editado ou removido, mantendo rastreabilidade.

O modelo atual de hábitos oferece frequência `daily`, `weekly` e `monthly`, mas não possui recorrência personalizada por dia da semana. Nesta entrega, apenas hábitos geram EXP.

## Problema

Como calcular EXP de forma centralizada, idempotente e auditável, sem inflar o total em sincronizações repetidas e sem perder o histórico quando uma concessão é corrigida?

## Alternativas consideradas

1. **Campos de EXP diretamente em atividades e registros.** Simples, mas duplica a regra em cada mutação, dificulta correções e não deixa histórico do que foi concedido ou estornado.
2. **Recalcular o total a cada leitura, sem persistir eventos.** Evita duplicidade, porém não oferece extrato, não preserva o motivo de cada concessão e tende a ficar caro quando novas categorias forem adicionadas.
3. **Extrato append-only com sincronização de estado líquido (escolhida).** Cada origem lógica tem um saldo desejado; o serviço compara o desejado com o líquido já registrado e acrescenta um evento de ajuste quando necessário.

## Decisão

- Criar `xp_events`, um extrato imutável com `amount` assinado, `event_key` único, `source`, `source_ref`, `category`, `kind`, `reason`, `description`, `activity_date` e `recorded_at`.
- O saldo é sempre `SUM(amount)`. Correções são novos eventos com sinal oposto; eventos nunca são apagados.
- `event_key` usa a origem lógica e a geração (`<source_ref>:g<N>`), impedindo concessões duplicadas.
- `source_ref` identifica a ocorrência lógica: dia do hábito, semana, mês ou bônus semanal. A sincronização compara o saldo desejado com o saldo líquido por `source_ref`.
- Cada ocorrência válida de hábito vale **1 EXP**.
- Uma semana completa concede **7 EXP** adicionais para hábitos diários e semanais. Em hábitos diários, a semana só fecha com os sete dias previstos concluídos; em semanais, a própria meta do período é a ocorrência prevista. Hábitos mensais não recebem bônus semanal.
- A semana segue o modelo existente da Elisa: domingo a sábado.
- A progressão de níveis é calculada exclusivamente no backend, com aritmética inteira:

| Nível | EXP acumulado para alcançar |
| --- | --- |
| 0 | 0 |
| 1–16 | `L² + 6L` |
| 17–31 | `(5L² − 81L + 720) / 2` |
| 32+ | `(9L² − 325L + 4440) / 2` |

- A primeira abertura do perfil sincroniza hábitos históricos e reconstrói o extrato de forma idempotente.
- Excluir uma atividade gera estornos antes da remoção dos registros. `activity_id` no extrato é apenas referência histórica, sem foreign key, para que o extrato sobreviva à atividade.
- O endpoint `GET /api/profile` expõe nível, EXP total, progresso, estatísticas de hábitos, distribuição por categoria e eventos recentes.

## Justificativa

O extrato mantém uma única fonte de verdade, permite auditar e desfazer concessões sem apagar histórico e evita que Atividades, Mídia ou qualquer módulo futuro implementem regras próprias de nível. A sincronização por estado desejado é idempotente e tolera chamadas repetidas em mutações e leituras.

## Consequências e limitações

- `GET /api/profile` pode criar eventos ao sincronizar dados antigos; a operação é idempotente.
- O extrato cresce com o uso e é lido integralmente para calcular o total. Isso é aceitável no volume pessoal atual, mas pode exigir agregações persistidas se o histórico crescer muito.
- A sincronização percorre todos os hábitos, inclusive arquivados. Atividades excluídas não entram nas estatísticas atuais, mas seus eventos de estorno permanecem no extrato.
- Apenas hábitos geram EXP nesta versão. Mídia, Diário, Projetos e Conhecimento não têm regras de EXP.
- Recorrência personalizada ainda não existe no modelo de hábitos. Até que exista, a frequência semanal representa o caso mais próximo; qualquer evolução deve atualizar a previsão de ocorrências da semana no serviço de EXP.
- A fórmula de níveis é fechada e usada em todo o produto. O frontend não recalcula níveis nem EXP.
