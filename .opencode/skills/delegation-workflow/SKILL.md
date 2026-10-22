---
name: delegation-workflow
description: >-
  Use ao planejar ou executar tarefas da Elisa que cruzam banco, backend, frontend ou testes,
  ao decidir se convém delegar a um subagente, ao preparar trabalho paralelo ou ao revisar
  entregas de subagentes. Também cobre os limites seguros de Git e worktrees neste projeto.
---

# Delegação e trabalho paralelo

Esta skill define como o agente principal usa os subagentes da Elisa sem duplicar responsabilidades, perder contexto ou criar alterações concorrentes.

## Quando delegar

Delegue quando a tarefa tiver uma responsabilidade técnica clara e delimitada:

| Situação | Subagente |
| --- | --- |
| Schema, modelos SQLAlchemy, repositories, migrações, índices, integridade | `database-specialist` |
| Rotas Flask, serviços, validação, contratos JSON, erros | `backend-specialist` |
| Componentes, telas, formulários, acessibilidade, Tailwind | `frontend-specialist` |
| Cobertura, regressões, revisão de arquitetura e segurança | `test-review-specialist` |

Não delegue:

- decisões de produto, arquitetura ou prioridade;
- uma tarefa ambígua que ainda precisa ser investigada;
- a mesma responsabilidade para dois agentes ao mesmo tempo;
- commit, push, merge, rebase ou publicação;
- acesso a dados pessoais, segredos ou bancos locais sem necessidade e autorização.

Para uma tarefa pequena e localizada, execute diretamente. Delegação não é objetivo por si só.

## Contrato de delegação

Todo pedido a um subagente deve conter:

1. **Objetivo:** resultado observável esperado.
2. **Escopo:** arquivos, módulos e limites explícitos.
3. **Contexto mínimo:** documentos de `context/` e decisões relevantes.
4. **Restrições:** o que não alterar, invariantes do domínio e dependências proibidas.
5. **Validação:** comandos e critérios de aceite.
6. **Saída:** o que o subagente deve relatar ao terminar.

Exemplo de brief:

```text
Objetivo: adicionar validação de unidade no endpoint X.
Escopo: backend/app/api/..., backend/app/services/..., backend/tests/...
Contexto: AGENTS.md, context/ARCHITECTURE.md, context/modules/..., ADR relevante.
Restrições: não alterar schema; não editar frontend; preservar contrato Y.
Validação: .\.venv\Scripts\python.exe -m pytest <teste focado>.
Saída: arquivos, contrato, testes executados, riscos e docs a atualizar.
```

O subagente deve carregar `elisa-context` e ler apenas o necessário.

## Ordem e paralelismo

1. Investigue o estado real antes de dividir a tarefa.
2. Faça mudanças de schema antes das camadas que dependem delas.
3. Rode em paralelo apenas trabalhos independentes e com arquivos não sobrepostos.
4. Não paralelize backend e frontend quando o contrato de API ainda estiver indefinido.
5. O agente principal integra os resultados, revisa o diff e executa a validação final.

## Aceite e validação

- Exija evidência de testes; relatos sem comandos e resultados não bastam.
- Verifique o diff real, não apenas o resumo do subagente.
- Rode a suíte proporcional ao risco e, quando viável, a suíte completa.
- Confirme que documentação, contratos e invariantes continuam coerentes.
- Se um teste não puder rodar, registre o bloqueio e não declare conclusão.

## Git e worktrees

Regras atuais:

- Nunca faça commit, push, merge, rebase, tag ou limpeza automática.
- `git status` é obrigatório antes de alterar arquivos existentes.
- Não use comandos destrutivos nem apague dados locais.
- O repositório atual ainda não possui commit inicial; `git worktree add` não funciona até que exista um commit.
- A build desktop testada (OpenCode 1.19.x) não expõe ferramentas nativas confirmadas de criação/remoção de worktrees. Não implemente automação de worktrees nesta etapa.
- Worktrees manuais só com autorização explícita do usuário e após confirmar que há um commit base.
- Se autorizado no futuro, use um diretório fora do repositório, uma branch própria e remova apenas worktrees limpos. Nunca use `--force` sem confirmação.

Fluxo manual seguro, somente sob autorização:

```powershell
git worktree list
git worktree add ..\hub-worktrees\<nome> -b <branch>
# trabalhar no diretório isolado
git worktree remove ..\hub-worktrees\<nome>
```

## Condições de parada

Pare e consulte o usuário quando:

- houver conflito entre instruções ou documentos;
- a mudança puder apagar dados ou exigir migração irreversível;
- faltar autorização para ação destrutiva ou para publicar;
- um segredo, dado pessoal ou caminho sensível for necessário;
- o subagente não conseguir validar o resultado e não houver alternativa segura.

## Documentação

Ao concluir, atualize apenas os documentos afetados em `context/` e registre decisões duráveis como ADR. Não duplique conteúdo entre `AGENTS.md`, `context/` e esta skill; referencie a fonte correta.
