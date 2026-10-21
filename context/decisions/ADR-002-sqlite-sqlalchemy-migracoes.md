# ADR-002 — SQLite com SQLAlchemy e migrações

- Data: 2026-10-21
- Status: Aceita

## Contexto

Os dados são pessoais, locais e relacionais: atividades e registros diários com restrições de unicidade e exclusão em cascata.

## Problema

Onde e como persistir dados de forma confiável, evoluível e independente do código-fonte?

## Alternativas consideradas

1. Arquivos JSON manipulados pela aplicação.
2. SQLite com SQLAlchemy e Flask-Migrate.
3. PostgreSQL local.

## Decisão

Usar SQLite em `data/elisa.db`, acessado exclusivamente por SQLAlchemy, com alterações de esquema via Flask-Migrate/Alembic. O caminho é configurável por `DATABASE_URL` e o banco fica fora dos diretórios de código.

## Justificativa

- Transações, restrições e consultas relacionais reais.
- Zero servidor externo; um arquivo local.
- SQLAlchemy isola o acesso e permite migrar para outro banco no futuro.
- Migrações preservam dados entre versões.
- Backup consistente pela API de backup do SQLite.

## Consequências e limitações

- SQLite tem escrita serializada; suficiente para uso pessoal.
- É necessário aplicar `flask db upgrade` após atualizar o projeto.
- Migrações precisam ser revisadas e versionadas.
- JSON não é usado como substituto de banco relacional.
