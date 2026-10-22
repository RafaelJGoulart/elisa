# AGENTS.md — Elisa

Instruções para agentes de programação que retomam este projeto.

## Antes de trabalhar

1. Leia este arquivo e [`context/INDEX.md`](context/INDEX.md).
2. Leia apenas os documentos relevantes para a tarefa. Para arquitetura, consulte [`context/ARCHITECTURE.md`](context/ARCHITECTURE.md); para UI, [`context/DESIGN_SYSTEM.md`](context/DESIGN_SYSTEM.md); para padrões, [`context/CONVENTIONS.md`](context/CONVENTIONS.md).
3. Verifique [`context/DECISIONS.md`](context/DECISIONS.md) antes de propor mudanças arquiteturais.
4. Inspecione o estado do Git com `git status` antes de alterar arquivos existentes. **Não faça commits sem autorização explícita.**

## Stack e caminhos principais

- Frontend: `frontend/` — React + TypeScript + Vite + Tailwind 4; componentes em `src/components/ui` e `src/components/shared`; módulos em `src/features/activities`, `src/features/media` e `src/features/diary`.
- Backend: `backend/` — Flask app factory em `backend/app/__init__.py`; rotas em `backend/app/api`; regras em `backend/app/services`; dados em `backend/app/repositories`; modelos em `backend/app/models`.
- Launcher: `elisa_desktop.py` e `desktop/launcher.html` — janela de controle opcional; a interface React continua no navegador.
- Marca: `frontend/src/brand/mark.json` (geometria única) e `assets/brand/` (SVG, PNG e ICO gerados); regenere com `python scripts/generate_brand_assets.py` (requer Pillow).
- Dados: `data/elisa.db` (SQLite) e `data/diary/` (Markdown canônico do Diário), ambos ignorados pelo Git. Nunca versione bancos, backups, `.env` ou segredos.
- Documentação: `context/` (Markdown, links relativos).

## Comandos

Use PowerShell na raiz do projeto.

```powershell
# backend
.\.venv\Scripts\python.exe backend\run.py
.\.venv\Scripts\python.exe -m pytest

# launcher desktop (opcional; requer backend\requirements-desktop.txt e frontend\dist)
.\.venv\Scripts\python.exe elisa_desktop.py

# frontend
cd frontend
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

Se o PowerShell bloquear `npm.ps1` por ExecutionPolicy, use `npm.cmd` com os mesmos argumentos.

Migrações (a partir de `backend/`):

```powershell
..\.venv\Scripts\flask.exe --app run db migrate -m "descrição"
..\.venv\Scripts\flask.exe --app run db upgrade
```

## Agentes especializados

Subagentes disponíveis em `.opencode/agent/`:

| Agente | Use para |
| --- | --- |
| `database-specialist` | Modelos SQLAlchemy, repositories, migrações, integridade e testes de persistência. |
| `backend-specialist` | Rotas Flask, serviços, validação, contratos JSON, erros e testes de API. |
| `frontend-specialist` | React, TypeScript, Tailwind, componentes, acessibilidade e testes de UI. |
| `test-review-specialist` | Cobertura, regressões, arquitetura, segurança e revisão antes da conclusão. |

O agente principal continua responsável por investigar, dividir o trabalho, revisar o diff, executar a validação final e atualizar a documentação.

1. Carregue a skill nativa `delegation-workflow` ao planejar delegação ou trabalho paralelo.
2. Delegue apenas tarefas delimitadas, com objetivo, escopo, restrições, validação e saída esperada.
3. Subagentes não devem invocar outros subagentes nem tomar decisões de produto ou arquitetura.
4. Rode trabalhos independentes em paralelo apenas quando não houver arquivos ou contratos sobrepostos.
5. Não delegue commit, push, merge, rebase, publicação ou acesso a dados pessoais.
6. Exija evidência real de testes; não aceite relatos sem comandos e resultados.
7. Após criar ou alterar agentes, skills ou configuração, reinicie o OpenCode.

Worktrees manuais exigem autorização explícita, um commit base existente e remoção apenas de árvores limpas. Não implemente automação de worktrees nesta fase.

## Regras obrigatórias

- Mantenha a arquitetura modular: UI não contém regra de negócio; rotas não contêm SQL; acesso a dados passa por repositories.
- PyWebView é apenas o launcher: não carregue, reescreva, migre ou incorpore a interface React nele. A aplicação continua no navegador; a janela de controle apenas inicia, monitora e encerra o servidor.
- O launcher nunca encerra processos que não iniciou; instâncias externas devem ser detectadas e preservadas.
- Valide entradas no backend (a validação do frontend é apenas conveniência).
- Datas de registro são datas locais `YYYY-MM-DD`; timestamps de criação são UTC em ISO 8601 com `Z`.
- Cores de atividade são chaves da paleta (`purple`, `magenta`, `red`, `green`, `blue`, `yellow`, `orange`), não hexadecimais.
- Unidades de hábito só convertem dentro da mesma dimensão; unidades personalizadas nunca são convertidas. Em mídia, unidades diferentes são agregadas separadamente, e tempo estimado nunca é apresentado como real.
- EXP e níveis são centralizados no backend sobre `xp_events` append-only. Não duplique fórmulas ou concessões no frontend nem crie um segundo sistema de XP; hábitos são a única fonte nesta versão.
- Não adicione bibliotecas que dupliquem responsabilidades existentes. Ícones: apenas Feather via `components/shared/Icon.tsx`.
- Não simule IA, dados fictícios ou funcionalidades não implementadas. Estados "planejado"/"indisponível" devem ser honestos.
- Diário: Markdown é a fonte canônica; o SQLite é apenas índice reconstruível e não guarda o corpo. Preserve escrita atômica, validação de IDs e confinamento de caminhos em `DIARY_DIR`.
- Toda funcionalidade concluída deve persistir dados e ter testes proporcionais.
- Execute testes, lint, typecheck e build antes de declarar uma tarefa concluída.
- Atualize a documentação afetada em `context/` (índice, módulo, roadmap, decisões e design system quando aplicável).
- Nunca registre segredos, tokens ou dados pessoais em documentação.
- Não use comandos destrutivos nem apague dados locais sem necessidade e sem confirmação.

## Skills disponíveis

- `context/skills/` — procedimentos do projeto: novo módulo, endpoint Flask, UI React, launcher desktop, migração de banco, testes e atualização de documentação.
- `.opencode/skills/` — skills nativas do OpenCode: `delegation-workflow` e `elisa-context`. Não duplique o conteúdo de `context/`; referencie.
