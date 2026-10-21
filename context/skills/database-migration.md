# Skill — Criar migração de banco

## Antes de alterar dados

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py
```

Confirme o backup em `data/backups/`.

## Alterar o modelo

1. Edite ou crie o modelo em `backend/app/models/`.
2. Garanta importação em `backend/app/models/__init__.py`.
3. Se necessário, atualize repositories e services.
4. Gere a migração a partir de `backend/`:

```powershell
cd backend
..\.venv\Scripts\flask.exe --app run db migrate -m "descrição curta"
```

5. **Revise o arquivo gerado** em `backend/migrations/versions/`. Verifique:
   - tabelas, colunas, tipos e nulabilidade;
   - chaves estrangeiras e `ondelete`;
   - índices e restrições únicas;
   - necessidade de `batch_alter_table` no SQLite;
   - downgrade viável.
6. Aplique:

```powershell
..\.venv\Scripts\flask.exe --app run db upgrade
```

7. Se a migração estiver errada e ainda **não** tiver sido aplicada, apague o arquivo e gere de novo. Nunca edite uma migração já aplicada.

## Verificação

```powershell
cd ..
.\.venv\Scripts\python.exe -m pytest
```

Abra a aplicação e confirme que os dados anteriores permanecem. Atualize `ARCHITECTURE.md` e o documento do módulo. Registre ADR se a decisão for estrutural.
