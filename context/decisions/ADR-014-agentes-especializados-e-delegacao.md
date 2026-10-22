# ADR-014 — Agentes especializados e delegação

- Data: 2026-10-22
- Status: Aceita

## Contexto

A Elisa já tem arquitetura modular, documentação durável em `context/` e procedimentos repetíveis em `context/skills/`. O trabalho assistido por IA, porém, ainda dependia de um único agente genérico lendo todo o projeto. Isso aumenta o risco de misturar responsabilidades, duplicar regras e alterar camadas erradas.

O OpenCode está instalado como aplicativo desktop. A build usada nesta etapa é da série 1.19.x e não expôs ferramentas nativas confirmadas para criar ou remover worktrees do Git. O repositório também ainda não possui commit inicial.

## Problema

Como dividir tarefas entre especialistas sem criar uma burocracia de agentes, sem duplicar a documentação existente e sem permitir ações autônomas de Git ou mudanças fora de escopo?

## Alternativas consideradas

1. **Manter apenas um agente genérico com instruções em `AGENTS.md`.** Simples, mas não delimita responsabilidades nem reduz o risco de SQL em rotas, regra de negócio na UI ou testes frágeis.
2. **Criar um agente para cada arquivo ou tecnologia.** Granularidade excessiva, muitos prompts para manter e maior chance de sobreposição.
3. **Criar um agente orquestrador primário e automação de worktrees nesta etapa.** Aumenta a complexidade e depende de recursos não confirmados na versão instalada.
4. **Quatro subagentes especializados, duas skills nativas e o agente principal existente como integrador (escolhida).** Mantém a divisão por camada, reutiliza a documentação atual e deixa Git e integração sob controle humano.

## Decisão

- Criar quatro subagentes em `.opencode/agent/`:
  - `database-specialist`: modelos, repositories, migrações e testes de persistência;
  - `backend-specialist`: rotas Flask, serviços, validação, contratos e testes de API;
  - `frontend-specialist`: React, TypeScript, Tailwind, acessibilidade e testes de UI;
  - `test-review-specialist`: cobertura, regressões, arquitetura, segurança e revisão.
- Cada subagente tem permissões restritas por caminho e comando, não pode invocar outros subagentes e não pode fazer commit, push, merge, rebase ou limpeza de worktree.
- Criar duas skills nativas em `.opencode/skills/`:
  - `delegation-workflow`: quando delegar, contrato de delegação, paralelismo, validação, Git e limites de worktrees;
  - `elisa-context`: ordem mínima de leitura, fontes de verdade, invariantes e atualização documental.
- O agente principal continua sendo o integrador: investiga, divide o trabalho, revisa o diff, executa a validação final e atualiza a documentação.
- `context/skills/` permanece como procedimentos do projeto; `.opencode/skills/` contém apenas skills operacionais do OpenCode. As fontes não devem ser duplicadas.
- Não implementar automação de worktrees nesta etapa. Worktrees manuais só podem ser usados com autorização explícita, após existir um commit base e com remoção apenas de árvores limpas.
- Nenhuma mudança de comportamento do produto, schema ou dependência é introduzida por este ADR.

## Justificativa

A divisão por camada acompanha a arquitetura já existente e reduz sobreposição: dados, backend, frontend e revisão têm fronteiras verificáveis. Permissões por caminho tornam os limites executáveis, não apenas textuais. O agente principal mantém a visão do todo e evita que subagentes tomem decisões de produto ou publiquem alterações.

As skills preservam contexto sem inflar cada prompt de agente. A documentação em `context/` continua sendo a memória durável; os agentes apenas apontam para ela.

## Consequências e limitações

- Agentes e skills exigem reinício do OpenCode para serem recarregados após alterações.
- Subagentes usam o modelo do agente principal quando nenhum modelo próprio é configurado.
- A qualidade depende de briefs claros e da revisão do agente principal; delegação não substitui validação.
- As permissões são uma barreira de segurança, mas não impedem um comando permitido de causar efeitos indesejados. Comandos destrutivos e publicação continuam proibidos.
- A versão atual não oferece automação nativa de worktrees. O fluxo manual pode ser adotado no futuro, mas não faz parte desta entrega.
- Como o repositório ainda não tem commit inicial, worktrees não podem ser criadas até que o usuário autorize esse marco.
- Novos agentes ou skills devem ser justificados por uma responsabilidade distinta; caso contrário, amplie o agente existente.
- A documentação de delegação deve ser atualizada se o OpenCode passar a oferecer worktrees nativas ou mudar a sintaxe de permissões.
