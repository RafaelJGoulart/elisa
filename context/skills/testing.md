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
- conversão apenas entre unidades da mesma dimensão e preservação da unidade original;
- múltiplos registros no mesmo dia e recálculo após editar/excluir;
- progresso de mídia separado de revisitas e de unidades diferentes;
- tempo real, estimado e desconhecido sem mistura;
- migração preservando dados existentes e semeando catálogos;
- EXP: concessão, bônus semanal, idempotência, registros parciais, edição, estorno e exclusão de atividade;
- extrato sobrevivendo à exclusão da atividade e hábitos arquivados contando normalmente;
- arquivos canônicos em diretório temporário, reindexação e falha de escrita (ver [markdown-persistence](markdown-persistence.md)).

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m pytest backend\tests\test_logs.py -q
.\.venv\Scripts\python.exe -m pytest backend\tests\test_habits.py backend\tests\test_media.py -q
.\.venv\Scripts\python.exe -m pytest backend\tests\test_xp.py -q
.\.venv\Scripts\python.exe -m pytest backend\tests\test_migrations.py -q
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
- diálogo de progresso: quantidade, unidade compatível e edição;
- diálogo de consumo de mídia: unidades derivadas do tipo e revisita;
- utilitários puros de mídia (rótulos, ícones e opções de unidade);
- perfil: nível, barra acessível, estatísticas, categorias, extrato, estado vazio e erro com nova tentativa;
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
