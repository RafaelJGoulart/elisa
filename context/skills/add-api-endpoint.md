# Skill — Adicionar endpoint Flask

## Fluxo

1. **Contrato primeiro:** defina método, rota, entrada, saída e códigos de status.
2. **Repository:** implemente a consulta em `backend/app/repositories/`.
3. **Service:** valide a entrada e aplique a regra em `backend/app/services/`. Erros usam `ValidationError`, `NotFoundError` ou `ConflictError`.
4. **Serializer:** adicione ou reutilize funções em `backend/app/api/serializers.py` (JSON em `camelCase`).
5. **Rota:** registre no blueprint em `backend/app/api/`; a rota só recebe, chama o service e devolve status. Sem SQL.
6. **Teste:** cubra sucesso, validação, 404/conflito e formato de erro.

## Padrões

- Prefixo `/api`.
- `GET` lista/detalhe; `POST` cria (201); `PATCH` atualiza parcialmente; `DELETE` remove (204).
- Corpo inválido: 422 com `details.fields`.
- Recurso ausente: 404 `not_found`.
- Duplicidade: 409 `conflict`.
- Datas: `YYYY-MM-DD`; timestamps UTC com `Z`.
- Nunca exponha stack trace, SQL ou caminho de arquivo.

## Exemplo de erro

```python
raise ValidationError(
    "Revise os campos informados.",
    {"fields": {"name": "Informe um nome para a atividade."}},
)
```

## Verificação

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Atualize `context/ARCHITECTURE.md` (tabela de endpoints) e o documento do módulo.
