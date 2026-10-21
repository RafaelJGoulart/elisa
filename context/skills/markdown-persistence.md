# Skill — Persistência Markdown e índice reconstruível

Use quando um módulo precisar de arquivos legíveis pelo usuário como fonte canônica e de um índice local para consultas. Implementação de referência: Diário.

## Invariantes

1. O arquivo é a fonte canônica; o banco guarda apenas metadados necessários para listar e filtrar.
2. O corpo nunca é copiado para o SQLite.
3. O índice pode ser apagado e reconstruído a partir dos arquivos.
4. Caminhos nunca vêm do cliente; IDs são validados e o caminho resolvido precisa continuar dentro do diretório canônico.
5. Escritas são atômicas: temporário no mesmo diretório, `flush`, `fsync`, `os.replace`.
6. Arquivo malformado é reportado e preservado; nunca é excluído automaticamente.
7. Timestamps locais ficam no arquivo quando o fuso importa; a API serializa UTC com `Z`.

## Implementação

### Diretório e nomes

```text
data/diary/AAAA/MM/<uuid32>-<slug>.md
```

- Use UUID hexadecimal de 32 caracteres como chave estável.
- Gere o slug na criação e não o altere ao renomear; o caminho é a identidade física do arquivo.
- Confine o caminho resolvido com `Path.resolve()` e `relative_to(root)`.

### Formato

```markdown
---
id: 0f5c2b1e8d4a4f6b9c7e2a1d3b4c5e6f
title: Um dia comum
created_at: 2026-10-21T17:05:00-03:00
updated_at: 2026-10-21T17:05:00-03:00
tags:
- pessoal
---

Texto integral.
```

- Leia YAML com `yaml.safe_load`.
- Valide `id`, tipos, limites e consistência de datas antes de indexar.
- Preserve o corpo exatamente como lido, exceto normalização documentada de quebras de linha.

### Índice

- Tabela com `id`, `file_path` único, título, data local, timestamps UTC e metadados auxiliares.
- Não inclua coluna de conteúdo.
- Ordenação e filtro por data usam o índice; busca textual e excerpt leem o arquivo.
- Se o índice estiver vazio e houver arquivos, dispare reconstrução automática.
- Exponha reindexação manual que retorne `indexed`, `skipped` e `errors`.

### Operações

- Criar: validar entrada → gravar arquivo → inserir/atualizar índice na mesma operação lógica.
- Atualizar: ler arquivo atual → aplicar campos → gravar no mesmo caminho → atualizar índice.
- Excluir: remover arquivo → remover linha do índice.
- Reindexar: varrer arquivos, ignorar e reportar erros, reconciliar linhas ausentes sem tocar nos arquivos inválidos.
- Falha de arquivo → erro de armazenamento seguro (500), sem prometer que o índice refletiu a mudança.

## Testes obrigatórios

- criação grava arquivo com frontmatter e corpo corretos;
- atualização preserva `created_at` e o caminho;
- exclusão remove arquivo e índice;
- reindexação reconstrói o índice; arquivo malformado continua no disco;
- caminhos `../`, absolutos, extensão errada e vazio são rejeitados;
- falha de escrita não trunca o conteúdo anterior;
- persistência após reiniciar e reconstrução após apagar o banco;
- busca, filtro e paginação.

## Backup

O backup do SQLite não cobre os arquivos. Inclua o diretório canônico no backup e documente essa separação. Sem os arquivos, o índice não tem como ser reconstruído.
