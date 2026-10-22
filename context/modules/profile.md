# Módulo — Perfil e EXP

**Status:** concluído em 2026-10-22
**Rota:** `/perfil`
**API:** `/api/profile`
**Decisão estrutural:** [ADR-013](../decisions/ADR-013-exp-ledger.md)

## Responsabilidade

Apresentar nível, EXP acumulado, progresso para o próximo nível, estatísticas de hábitos, distribuição por categoria e extrato recente. O cálculo de EXP e de níveis é centralizado no backend; o frontend apenas exibe o que a API retorna.

Nesta versão, **apenas hábitos geram EXP**. Mídia, Diário, Projetos e Conhecimento não possuem regras de EXP.

## Regras de EXP

- Cada ocorrência válida de hábito vale **1 EXP**.
- Hábito binário: uma ocorrência por dia concluído.
- Hábito mensurável diário: uma ocorrência por dia em que a meta foi atingida; sem meta, por dia com quantidade maior que zero.
- Hábito mensurável semanal: uma ocorrência por semana em que a meta do período foi atingida, sem exigir sete registros.
- Hábito mensurável mensal: uma ocorrência por mês em que a meta do período foi atingida.
- Semana completa: **7 EXP** adicionais para hábito diário ou semanal. No diário, exige os sete dias da semana; no semanal, exige a meta da semana. Hábito mensal não recebe bônus semanal.
- Semanas vão de domingo a sábado.
- Registros parciais não concedem EXP.
- Editar data, quantidade ou conclusão recalcula o estado do hábito e ajusta o extrato.
- Desmarcar uma conclusão ou excluir um registro gera estorno.
- Excluir uma atividade estorna todo o EXP líquido das origens daquela atividade antes de apagar os dados.
- O bônus semanal é líquido: no máximo 7 EXP ativos por hábito e semana. Se a semana for invalidada e voltar a ser válida, o extrato registra o estorno e uma nova concessão, mantendo o líquido correto.
- Eventos são idempotentes: sincronizar a mesma origem repetidamente não cria novos eventos enquanto o saldo desejado não mudar.

## Progressão de níveis

A progressão usa EXP acumulado, inclusive eventos de correção. A fórmula é aplicada somente no backend, com aritmética inteira:

| Nível | EXP acumulado necessário |
| --- | --- |
| 0 | 0 |
| 1–16 | `L² + 6L` |
| 17–31 | `(5L² − 81L + 720) / 2` |
| 32+ | `(9L² − 325L + 4440) / 2` |

O nível 1 começa em 7 EXP; o nível 2, em 16; o 17, em 394; o 32, em 1628. Níveis inválidos são normalizados para 0. A API informa tanto o intervalo do nível atual quanto os totais acumulados dos limites.

## Modelo de dados

### `xp_events`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | PK |
| `event_key` | texto | único; origem lógica + geração |
| `activity_id` | inteiro | referência histórica, sem FK; `NULL` se não houver atividade |
| `source` | texto | `habit` nesta versão |
| `source_ref` | texto | origem lógica da ocorrência ou bônus |
| `category` | texto | `habits` nesta versão |
| `kind` | texto | `occurrence` ou `weekly_bonus` |
| `reason` | texto | `grant` ou `correction` |
| `description` | texto | texto exibido no extrato |
| `amount` | inteiro | EXP assinado; saldo é a soma |
| `activity_date` | data | data da ocorrência ou fim da semana do bônus |
| `recorded_at` | datetime UTC | momento do registro |

O extrato é append-only. Não há `UPDATE` nem `DELETE` de eventos. O saldo líquido de uma origem é a soma dos eventos com o mesmo `source_ref`; correções usam sinal oposto.

Origens atuais:

- `habit:<id>:log:<data>` — conclusão binária ou meta diária mensurável;
- `habit:<id>:weekly:<início>` — meta semanal;
- `habit:<id>:monthly:<início>` — meta mensal;
- `habit:<id>:week_bonus:<início>` — bônus semanal.

## API

### `GET /api/profile`

```json
{
  "profile": {
    "level": 2,
    "totalXp": 20,
    "currentLevelTotalXp": 16,
    "nextLevelTotalXp": 32,
    "xpIntoLevel": 4,
    "xpToNextLevel": 12,
    "xpForNextLevel": 16,
    "progressPercent": 25,
    "stats": {
      "habitOccurrences": 13,
      "habitWeeks": 1,
      "habitXp": 20
    },
    "categories": [{ "key": "habits", "label": "Hábitos", "xp": 20 }],
    "recentEvents": [
      {
        "id": 21,
        "source": "habit",
        "category": "habits",
        "categoryLabel": "Hábitos",
        "kind": "weekly_bonus",
        "reason": "grant",
        "description": "Semana completa: Leitura",
        "amount": 7,
        "activityDate": "2026-10-17",
        "recordedAt": "2026-10-22T18:00:00Z"
      }
    ]
  }
}
```

- `progressPercent` vai de 0 a 100 e representa o avanço dentro do nível atual.
- `xpToNextLevel` é o que falta; `xpForNextLevel` é o tamanho total do nível.
- `stats.habitOccurrences` e `stats.habitWeeks` refletem o estado atual dos hábitos, não o histórico de eventos.
- `categories` traz apenas categorias com saldo diferente de zero.
- `recentEvents` retorna os 20 eventos mais recentes.
- A chamada sincroniza hábitos históricos antes de responder e persiste os eventos criados. É seguro repetir.

## Interface

- Cabeçalho "Perfil / Seu progresso" com atalho para Atividades.
- Cartão de nível com número grande, EXP acumulado, barra acessível (`role="progressbar"`, `aria-valuenow`), EXP dentro do nível, EXP restante e início do próximo nível.
- Três cartões de estatísticas: ocorrências de hábitos, semanas concluídas e EXP de hábitos.
- Coluna de distribuição por categoria, com barra proporcional; nesta versão aparece apenas Hábitos.
- Extrato com descrição, categoria, data da ocorrência e valor assinado. Valores positivos usam verde; estornos, vermelho; o sinal e o texto também comunicam o estado, nunca só a cor.
- Perfil sem EXP e sem eventos mostra um estado vazio explicando a primeira conquista e levando para Atividades. Se o saldo for zero por estornos, o extrato permanece visível para auditoria.
- Carregamento, erro com nova tentativa e layout responsivo seguem os componentes compartilhados.

## Arquivos

### Backend

- `app/models/xp.py`
- `app/repositories/xp_repository.py`
- `app/services/xp_service.py`
- `app/api/profile.py`
- `app/api/serializers.py`
- `app/services/activity_service.py` — sincronização após mutações e estorno antes de excluir
- `app/services/activity_stats.py` — estatísticas usadas na sincronização de hábitos mensuráveis
- `app/repositories/activity_repository.py` — `flush`
- `backend/migrations/versions/1cd28703a86b_add_xp_events_ledger.py`

### Frontend

- `src/features/profile/pages/ProfilePage.tsx`
- `src/features/profile/components/LevelProgressCard.tsx`
- `src/features/profile/components/ProfileStatCards.tsx`
- `src/features/profile/components/CategoryBreakdown.tsx`
- `src/features/profile/components/XpHistoryList.tsx`
- `src/features/profile/types.ts`
- `src/features/profile/format.ts`
- `src/services/profile.ts`
- `src/app/router.tsx`
- `src/components/shared/AppShell.tsx`

## Testes

Backend:

- `test_xp.py`: perfil vazio, curva de níveis, ocorrência binária, bônus semanal, idempotência, remoção/restauração, hábito semanal mensurável, registros parciais, edição de quantidade, hábito mensal, exclusão de atividade com estorno, hábito arquivado.
- `test_migrations.py`: criação e remoção da tabela `xp_events` na migração.

Frontend:

- `ProfilePage.test.tsx`: nível, barra, estatísticas, categorias, extrato, estado vazio, extrato com saldo zero e erro com nova tentativa.

## Limitações e evolução

- Apenas hábitos geram EXP. Novas categorias exigem uma origem de sincronização que produza eventos desejados e uma chave estável por ocorrência.
- Não existe recorrência personalizada por dia da semana no modelo de hábitos. A frequência semanal é o caso suportado atualmente.
- O extrato é recalculado percorrendo todos os hábitos quando o perfil é aberto. Para volumes maiores, considerar agregações persistidas por categoria e por nível.
- Não há exclusão ou edição manual de eventos; correções acontecem pelas mutações reais dos hábitos.
- Não há conquistas, medalhas, loja ou recompensas além dos níveis.
