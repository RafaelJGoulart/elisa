# Skill — Criar um novo módulo

Use quando for adicionar uma funcionalidade com UI, API e persistência próprias.

## Antes

1. Leia [ARCHITECTURE](../ARCHITECTURE.md), [MODULES](../MODULES.md) e [DESIGN_SYSTEM](../DESIGN_SYSTEM.md).
2. Verifique [DECISIONS](../DECISIONS.md) e o [ROADMAP](../ROADMAP.md).
3. Confirme que o módulo não duplica uma responsabilidade existente.

## Backend

1. Crie modelos em `backend/app/models/<modulo>.py` e importe em `models/__init__.py`.
2. Crie o repository em `backend/app/repositories/<modulo>_repository.py` com consultas SQLAlchemy.
3. Crie o service em `backend/app/services/<modulo>_service.py` com validação, regras e transações.
4. Crie o blueprint em `backend/app/api/<modulo>.py` e registre em `app/api/__init__.py`.
5. Adicione serializadores em `app/api/serializers.py` se o contrato for distinto.
6. Crie migração Alembic (ver [database-migration](database-migration.md)). Se houver catálogo padrão (tipos, unidades), semeie na migração e garanta a criação idempotente em runtime para testes e bancos novos.
7. Se o módulo usar arquivos canônicos, siga [markdown-persistence](markdown-persistence.md).
8. Adicione testes em `backend/tests/test_<modulo>.py`, incluindo persistência entre instâncias e migração quando houver dados semeados.

## Frontend

1. Crie `src/features/<modulo>/` com `pages/`, `components/` e `types.ts`.
2. Adicione o serviço em `src/services/<modulo>.ts` usando `lib/api.ts`.
3. Adicione rotas em `src/app/router.tsx`.
4. Adicione navegação em `components/shared/AppShell.tsx` (remova o estado "planejado" correspondente).
5. Reutilize `PageHeader`, estados, `ToastProvider`, diálogos e componentes `ui/`.
6. Siga tokens e acessibilidade do design system.
7. Adicione testes comportamentais.

## Documentação

1. Crie `context/modules/<modulo>.md` com responsabilidade, modelo, API, UI, arquivos e limitações.
2. Atualize `context/MODULES.md`, `context/INDEX.md` e `context/ROADMAP.md`.
3. Registre decisão estrutural como ADR, se houver.
4. Atualize `README.md` se comandos, dados ou escopo mudarem.
5. Inclua o diretório canônico nas instruções de backup quando houver arquivos fora do banco.

## Verificação

```powershell
.\.venv\Scripts\python.exe -m pytest
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

Não marque o módulo como ativo na interface antes de ele estar funcional e persistindo dados.
