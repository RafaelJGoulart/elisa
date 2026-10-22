# Skill — Backup e restauração do banco

## Backup

Com a aplicação parada ou em uso, use a API de backup do SQLite (gera cópia consistente):

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py
```

Destino padrão: `data/backups/elisa-AAAAMMDD-HHMMSS.db`.

Opções:

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py --source data\elisa.db --destination D:\backups\elisa
```

Nunca copie apenas o arquivo `.db` enquanto houver escrita; use o script ou pare o servidor.

O Diário **não** está no banco. Copie também `data/diary/` para o mesmo destino de backup. Os arquivos Markdown são a fonte canônica; o índice SQLite pode ser reconstruído, mas os arquivos não.

## Restauração

1. Pare o backend.
2. Faça um backup do banco atual (mesmo que suspeito):

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py --destination data\backups\pre-restore
```

3. Escolha um backup e substitua `data/elisa.db` por ele (renomeie/copie). Restaure também `data/diary/` quando o backup incluir o Diário.
4. Verifique migrações e aplique, se necessário:

```powershell
cd backend
..\.venv\Scripts\flask.exe --app run db upgrade
```

5. Inicie o backend e confirme health, lista de atividades, histórico, acervo de mídia e Diário.
6. Se o índice do Diário estiver vazio, reindexe:
   `Invoke-RestMethod -Method Post http://127.0.0.1:5000/api/diary/reindex`.
7. Rode os testes: `.\.venv\Scripts\python.exe -m pytest`.

## Regras

- `data/` e backups nunca vão para o Git.
- Não apague backups antigos sem confirmação.
- Antes de migração ou operação destrutiva, gere um backup identificável.
- Documente qualquer restauração relevante na tarefa/entrega.
