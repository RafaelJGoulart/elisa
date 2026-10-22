# Skill — Adicionar uma fonte de EXP

## Antes

1. Leia [ADR-013](../decisions/ADR-013-exp-ledger.md), [modules/profile.md](../modules/profile.md) e [ARCHITECTURE](../ARCHITECTURE.md).
2. Confirme que a funcionalidade tem ocorrências **reais e persistidas**. Não crie EXP para dados fictícios, estimativas ou estados planejados.
3. Defina a regra fora do frontend. O backend é a única fonte de EXP e de níveis.

## Contrato da origem

Toda origem de EXP precisa de:

- `source`: identificador estável da área, por exemplo `habit`.
- `source_ref`: chave lógica da ocorrência, estável enquanto ela existir.
- `category`: categoria do extrato, com rótulo em `CATEGORY_LABELS`.
- `kind`: tipo lógico do evento.
- `activity_date`: data local da ocorrência.
- `description`: texto curto e auditável.

A origem não grava EXP diretamente em tabelas de domínio. Ela produz um **estado desejado** (saldo por `source_ref`) e chama a sincronização.

## Implementação

1. Adicione a categoria em `backend/app/services/xp_service.py` (`CATEGORY_LABELS`).
2. Crie uma função que monte `dict[str, DesiredEvent]` para a origem:
   - uma entrada por ocorrência válida;
   - uma entrada por bônus, se houver;
   - `source_ref` sem dados pessoais e sem descrição; prefira IDs e datas.
3. Sincronize comparando o desejado com `xp_repository.net_by_source_ref(...)`. Nunca insira um evento sem verificar o saldo líquido.
4. Use o gerador de `event_key` (`<source_ref>:g<N>`) e `reason` `grant` na primeira geração ou `correction` nos ajustes.
5. Em remoções, gere estornos antes de apagar os dados de origem. O extrato não usa FK para a origem, para preservar o histórico.
6. Chame a sincronização dentro da mesma transação da mutação, com `flush()` antes de consultar os dados alterados.
7. Exponha a contagem atual da origem apenas se o perfil precisar dela. O saldo de EXP vem do extrato, não de um contador paralelo.

## Regras que não podem ser quebradas

- Cada ocorrência válida vale 1 EXP, salvo decisão explícita em ADR.
- Bônus semanal vale 7 EXP e é **líquido**: no máximo um bônus ativo por origem e semana.
- Semanas vão de domingo a sábado.
- Registros parciais não concedem EXP.
- Eventos são append-only; correções têm sinal oposto.
- `event_key` é único e a sincronização é idempotente.
- O frontend não replica fórmulas de nível, bônus ou ocorrência.
- Um novo módulo não pode criar um segundo sistema de XP ou de níveis.

## Checklist

- [ ] A regra está coberta por testes de concessão, não concessão, repetição e estorno.
- [ ] Datas usam `YYYY-MM-DD`; timestamps usam UTC com `Z`.
- [ ] Excluir ou editar a origem ajusta o extrato sem apagar eventos.
- [ ] Dados antigos podem ser sincronizados de forma idempotente.
- [ ] A categoria aparece no perfil e no extrato.
- [ ] `GET /api/profile` e `ProfilePage` continuam usando o contrato existente.
- [ ] Documentação, ADR quando estrutural, roadmap e testes foram atualizados.

## Verificação

```powershell
.\.venv\Scripts\python.exe -m pytest
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```
