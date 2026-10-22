# Convenções

## Idioma

- Interface, mensagens de erro, documentação e comentários de produto em português do Brasil.
- Código (variáveis, funções, tipos) em inglês.
- Datas exibidas em `dd/MM/aaaa`; datas por extenso com locale `ptBR`.

## Frontend

### Arquivos e nomes

- Componentes React em `PascalCase.tsx`; hooks em `camelCase.ts` com prefixo `use`.
- Módulos em `src/features/<nome>/` com `components/`, `pages/` e `types.ts`.
- Componentes base em `src/components/ui/`; compartilhados em `src/components/shared/`.
- Importações usam o alias `@/`.
- Tipos importados com `import type`.

### TypeScript

- Modo estrito, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- Sem `any` implícito. Prefira tipos explícitos nos contratos de API.
- Sem `enum`; use uniões literais e constantes (`as const`).
- Componentes funcionais e hooks; sem classes.

### Dados e API

- Nenhum `fetch` fora de `src/lib/api.ts`; páginas usam `src/services/`.
- Erros da API chegam como `ApiError` com `status`, `code`, `message` e `details`.
- Estados de tela: carregando, erro, vazio, sucesso — sempre tratados.
- Toda mutação fornece feedback (toast) e recarrega o recurso afetado.

### UI

- Tokens em `globals.css`; não introduza hexadecimais em componentes, exceto a paleta centralizada em `lib/colors.ts`.
- Use componentes de `components/ui` antes de criar equivalentes.
- Ícones apenas via `Icon` (Feather). Não importe outra biblioteca de ícones.
- Texto sobre cor vibrante usa `text-primary-foreground` (escuro) para contraste.

## Backend

### Camadas e nomes

- Python 3.12, type hints e `from __future__ import annotations`.
- `snake_case` para funções, variáveis e colunas; `PascalCase` para classes.
- Rotas não contêm SQL nem cálculos de domínio.
- Repositories concentram consultas; services concentram regras e transações.
- Modelos usam SQLAlchemy 2 (`Mapped`, `mapped_column`) e `db.Model`.

### Validação

- Toda entrada é validada no backend, mesmo que o frontend já valide.
- Erros de campo: `ValidationError` com `details = {"fields": {...}}`.
- Mensagens objetivas, em português, sem expor detalhes internos.
- Limites atuais: atividade com nome 2–80, descrição até 500, categoria até 40 e cor na paleta; Diário com título até 160, conteúdo até 100.000, 10 etiquetas de até 30 caracteres e busca até 200.
- Hábitos mensuráveis: quantidade maior que zero e até 1.000.000.000, até 4 casas decimais; observação até 500; unidades personalizadas com nome até 40 e símbolo até 12.
- Mídia: título até 200, descrição/observações até 2.000, criador até 160, ano 1–3000, avaliação 1–5, até 10 gêneros de 40 caracteres, quantidade de consumo maior que zero, duração real mínima 0,01 e observação até 500.

### Transações e erros

- Serviços chamam `repository.commit()`, que faz rollback em falha.
- Not found → 404; conflito de unicidade → 409; validação → 422.
- Exceções inesperadas são registradas e retornam 500 genérico.
- Nunca retorne stack trace, caminho de arquivo ou SQL ao cliente.

## Unidades, metas e consumo

- Unidades de hábito têm `dimension` e `factor`; converta apenas dentro da mesma dimensão e nunca some grandezas diferentes.
- Unidades personalizadas têm dimensão própria e não são conversíveis para unidades padrão ou entre si.
- O registro guarda a unidade original; a conversão acontece na agregação para a unidade do hábito.
- Metas são opcionais e expressas na unidade do hábito; trocar para unidade compatível converte a meta.
- Hábitos binários permanecem diários e não aceitam unidade, meta ou quantidade.
- Em mídia, unidades diferentes (episódio, página, capítulo, hora etc.) são agregadas separadamente; não invente conversão.
- Revisitas somam no consumo, mas não no progresso. Progresso manual (`progressOverride`) não apaga o consumo.
- Tempo real, estimado e desconhecido são categorias distintas; não apresente estimativa como medição.

## Datas e fuso

- Registros diários e consumos: data local sem hora, `YYYY-MM-DD`.
- `created_at` / `updated_at`: UTC, serializados em ISO 8601 com `Z`.
- No frontmatter do Diário, timestamps preservam o fuso local; a API converte para UTC e a UI exibe em horário local.
- Datas futuras não podem ser registradas em atividades ou consumos de mídia.
- Não use `toISOString()` para obter a data local no frontend; use `toDateKey()` (`lib/dates.ts`).

## Arquivos Markdown do Diário

- Markdown é a fonte canônica; o SQLite guarda apenas metadados do índice.
- Caminho: `data/diary/AAAA/MM/<uuid32>-<slug>.md`. O slug não muda após edição de título.
- Frontmatter YAML com `id`, `title`, `created_at`, `updated_at`, `tags`; o corpo é o texto integral.
- Nunca aceite caminhos do cliente; valide IDs com `^[0-9a-f]{32}$` e confirme que o caminho resolvido permanece em `DIARY_DIR`.
- Escritas usam temporário no mesmo diretório, `flush`, `fsync` e `os.replace`.
- Arquivos malformados são ignorados/reportados, nunca apagados automaticamente.
- O índice deve poder ser reconstruído a partir dos arquivos sem perda de conteúdo.
- O corpo nunca deve ser copiado para o banco; listagem e busca leem o arquivo.
- `data/diary/` é ignorado pelo Git e precisa entrar em backups separadamente.

## Banco de dados

- SQLite local em `data/elisa.db`.
- Alterações de esquema sempre via migração Alembic.
- Não edite migrações já aplicadas; crie uma nova.
- Nunca versione `.db`, `.db-wal`, `.db-shm` ou backups.
- Faça backup antes de operações de dados relevantes: `scripts/backup_db.py`.

## Testes

- Backend: pytest, banco temporário isolado por teste, cobrindo CRUD, validação, 404, conflito, datas, sequências, conversões de unidade, agregações de mídia e persistência.
- Frontend: Vitest + Testing Library, priorizando regra de comportamento (calendário, formulários, listas, diálogos de progresso/consumo, proteção de alterações e estados) em vez de "renderiza sem erro".
- Testes devem ser determinísticos: não dependam da data real quando possível; componentes aceitam `today` para injeção.
- Mocks de serviço apenas nas fronteiras; não simule o banco nos testes de API.
- Persistência em arquivo deve ser testada em diretório temporário, incluindo falha de escrita, caminhos inválidos e reindexação.

## Desktop

- `elisa_desktop.py` é apenas composição operacional: inicia/para o servidor e controla a janela. Regra de negócio permanece no backend e no frontend.
- **Nunca carregue, copie ou migre o frontend React para dentro do pywebview.** A janela de controle não é a interface da Elisa; a aplicação continua no navegador.
- O launcher escuta sempre `127.0.0.1`; não use `FLASK_HOST` para expô-lo.
- Use Waitress para o servidor local, não `app.run` com debug. O launcher não é uma configuração de produção para rede.
- `pywebview` e `waitress` são dependências opcionais em `backend/requirements-desktop.txt`; não as importe no backend, nos testes de API ou no código de domínio.
- `desktop/launcher.html` é apenas a janela de controle; não duplique componentes, telas ou regras da interface React nele.
- O launcher só pode encerrar o servidor que ele próprio iniciou. Uma instância externa deve ser detectada e nunca finalizada pelo launcher.
- O servidor deve ser encerrado ao fechar a janela ou acionar **Encerrar Elisa**. Erros fatais devem ir para `data/elisa-desktop.log` e para uma caixa de diálogo nativa.
- O build do frontend é pré-requisito. O atalho `iniciar_elisa.cmd` só gera o build quando ele estiver ausente; Vite não é iniciado pelo launcher.

## Git

- Commits somente com autorização explícita.
- Inspecione `git status` e `git diff` antes de alterar arquivos existentes.
- Não versione `.env`, bancos, backups, `node_modules`, `.venv`, caches ou builds.
- Mensagens de commit curtas, no imperativo, descrevendo o efeito.

## Documentação

- Atualize `context/` na mesma tarefa em que o comportamento muda.
- Links relativos entre arquivos Markdown.
- Decisão durável → ADR; detalhe operacional → skill; estado → ROADMAP.
- Não duplique o mesmo conteúdo em vários documentos; referencie.
