# Skill — Escrever e executar testes

## Backend

Arquivos em `backend/tests/`:

- `conftest.py` cria app com banco SQLite temporário e `db.create_all()`.
- Cada teste recebe `client` e, quando útil, `activity` já criada.

Cubra:

- sucesso e formato da resposta;
- validação de campos e códigos de erro;
- recurso inexistente (404) e conflito (409);
- regras de data e unicidade;
- persistência entre instâncias da aplicação;
- cascata e efeitos colaterais;
- arquivos canônicos em diretório temporário, reindexação e falha de escrita (ver [markdown-persistence](markdown-persistence.md)).

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m pytest backend\tests\test_logs.py -q
```

Não use o banco real nos testes.

## Frontend

Vitest + Testing Library. Setup em `src/test/setup.ts` (jest-dom, matchMedia, ResizeObserver, pointer capture).

Priorize comportamento:

- formulário válido e inválido;
- chamadas ao serviço com o payload correto;
- estados da grade e seleção de dia;
- composição de texto, edição com descarte confirmado e busca;
- estados de erro/vazio, incluindo preservação do texto digitado;
- navegação essencial.

Evite testes que apenas verificam renderização sem regra.

Injete datas fixas: `ContributionCalendar` aceita `today`. Funções de data aceitam `Date`/`today`.

```powershell
cd frontend
npm test
npm run test:watch
```

## Antes de concluir

```powershell
.\.venv\Scripts\python.exe -m pytest
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

Relate apenas o que foi realmente executado.
