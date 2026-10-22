# Elisa

Ambiente pessoal digital modular, local-first e expansível. A Elisa combina acompanhamento de atividades, organização pessoal e, no futuro, uma companheira de IA com acesso controlado ao contexto local.

A versão atual inclui três módulos:

- **Atividades:** criação, edição e exclusão de hábitos binários e mensuráveis. Hábitos mensuráveis aceitam unidade, meta opcional e frequência diária, semanal ou mensal; registros quantitativos podem ocorrer várias vezes no mesmo dia. O histórico usa grade de contribuições, sequências e estatísticas por período.
- **Mídia:** catálogo local de animes, séries, filmes, livros, mangás, jogos, cursos, podcasts e tipos personalizados, com gêneros, busca, filtros, progresso, eventos de consumo e estatísticas de quantidade e tempo. Tempo real, estimado e desconhecido são exibidos separadamente.
- **Diário:** escrita livre em registros Markdown, com título opcional, etiquetas, busca, filtro por mês, edição e exclusão. O SQLite guarda apenas um índice reconstruível; o texto permanece em `data/diary/`.

## Stack

- **Frontend:** React 19, TypeScript estrito, Vite, Tailwind CSS 4, componentes no estilo shadcn/ui, Radix UI, React Router, Feather Icons, Zod, date-fns.
- **Backend:** Python 3.12, Flask 3, SQLAlchemy 2, Flask-Migrate/Alembic, SQLite, PyYAML.
- **Launcher desktop opcional:** pywebview e Waitress, usados apenas para a janela de controle e o servidor local; a interface continua no navegador.
- **Testes:** pytest (API e persistência) e Vitest + Testing Library (frontend).
- **Documentação de contexto:** Markdown interligado em [`context/`](context/INDEX.md).

Fontes (Inter e JetBrains Mono) e ícones Feather são servidos localmente pelo bundle; a aplicação não faz requisições a servidores externos em execução.

## Requisitos

- Python 3.12+
- Node.js 24+ e npm
- Git
- Windows com WebView2 apenas para o launcher desktop opcional

## Instalação

Na raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt

cd frontend
npm install
cd ..
```

Para usar o launcher desktop, instale as dependências opcionais:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-desktop.txt
```

Aplique as migrações do banco (execute a partir de `backend/`):

```powershell
cd backend
..\.venv\Scripts\flask.exe --app run db upgrade
cd ..
```

O banco é criado em `data/elisa.db`. Para usar outro caminho, copie `.env.example` para `.env` e ajuste `DATABASE_URL`.

## Desenvolvimento

Abra dois terminais na raiz.

Terminal 1 — backend Flask em `http://127.0.0.1:5000`:

```powershell
.\.venv\Scripts\python.exe backend\run.py
```

Terminal 2 — frontend Vite em `http://localhost:5173`:

```powershell
cd frontend
npm run dev
```

O Vite encaminha `/api` para o Flask. Acesse `http://localhost:5173`.

> Se o PowerShell bloquear `npm.ps1` por ExecutionPolicy, use `npm.cmd` (por exemplo, `npm.cmd run dev`).

## Build local (um único servidor)

```powershell
cd frontend
npm run build
cd ..
.\.venv\Scripts\python.exe backend\run.py
```

Com `frontend/dist` presente e `SERVE_FRONTEND=true`, o Flask serve o frontend em `http://127.0.0.1:5000`.

## Launcher desktop (opcional)

Com o build e as migrações prontos, inicie:

```powershell
.\.venv\Scripts\python.exe elisa_desktop.py
```

Ou use `iniciar_elisa.cmd`. A janela mostra o estado do servidor, o endereço local e as ações **Abrir Elisa** e **Encerrar Elisa**. A aplicação abre no navegador padrão.

O launcher é somente um controlador. Ele não carrega, reescreve ou migra a interface React para dentro do pywebview. Se já houver uma Elisa em execução, ele permite abri-la, mas não encerra uma instância que não iniciou. Após alterações no frontend, execute `npm run build` antes de usar o launcher.

## Testes e qualidade

Backend (na raiz):

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

## Dados e backup

- Banco local: `data/elisa.db` (ignorado pelo Git).
- Diário: arquivos Markdown em `data/diary/AAAA/MM/` (ignorados pelo Git). Eles são a fonte canônica; o banco contém apenas o índice.
- Migrações: `backend/migrations/`.
- Backup consistente do banco com a API de backup do SQLite:

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py
```

Os arquivos são salvos em `data/backups/elisa-AAAAMMDD-HHMMSS.db`. Use `--source` e `--destination` para caminhos diferentes.

> O backup acima não inclui o Diário. Copie também a pasta `data/diary/`. Se o índice for perdido, ele pode ser reconstruído a partir dos Markdown, mas os arquivos em si precisam de backup próprio.

## Estrutura

```text
elisa_desktop.py    launcher desktop opcional
iniciar_elisa.cmd   atalho do launcher
backend/
  app/
    api/            rotas Flask, serialização e tratamento de erros
    core/           configuração, extensões, erros e serving do frontend
    models/         modelos SQLAlchemy
    repositories/   acesso a dados
    services/       regras de negócio e validação
  migrations/       migrações Alembic
  tests/            testes pytest
desktop/            janela de controle do launcher (não contém a interface React)
frontend/
  src/
    app/            composição do app e rotas
    components/     ui/ (shadcn/ui) e shared/ (Icon, shell, estados)
    features/       módulos por funcionalidade (activities, media, diary, home)
    hooks/          hooks reutilizáveis
    lib/            API, datas, cores, validação do Diário e utilitários
    services/       contratos com o backend
    styles/         tokens e CSS global
context/            memória documental do projeto
data/               banco, Diário em Markdown e backups (não versionados)
scripts/            utilitários operacionais
```

## Documentação de continuidade

Comece por [`context/INDEX.md`](context/INDEX.md). Decisões arquiteturais, design system, convenções, roadmap e instruções para agentes estão em [`context/`](context/INDEX.md) e [`AGENTS.md`](AGENTS.md).

## Segurança e escopo

A aplicação é local e de usuário único. Não há autenticação nesta versão. O servidor escuta `127.0.0.1` por padrão; não exponha a aplicação na rede sem antes adicionar autenticação, HTTPS e uma revisão de segurança. Nenhuma integração de IA está ativa.
