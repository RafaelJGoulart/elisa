# Roadmap

Legenda: **Concluído** = implementado, testado e documentado. **Em andamento** = trabalho ativo. **Planejado** = intenção sem implementação. **Bloqueado** = depende de decisão ou recurso externo.

## v0.1.0 — Concluído (2026-10-21)

### Fundação

- [x] Frontend React 19 + TypeScript estrito + Vite + Tailwind CSS 4.
- [x] Componentes base no estilo shadcn/ui com Radix.
- [x] Tipografia local (Inter e JetBrains Mono) e Feather Icons via componente compartilhado.
- [x] Flask app factory, SQLAlchemy 2, SQLite e migrações Alembic.
- [x] Configuração por ambiente, `.env.example` e `.gitignore`.
- [x] API com erros padronizados e validação no backend.
- [x] Documentação de contexto, README e AGENTS.md.

### Interface

- [x] Shell responsivo com navegação, skip link e indicador real de saúde do servidor.
- [x] Página inicial com saudação, resumo de hoje e mapa de módulos.
- [x] Estados de carregamento, vazio e erro.
- [x] Toasts acessíveis e confirmação de exclusão.

### Módulo de Atividades

- [x] Criar, editar e excluir atividades.
- [x] Nome, descrição, categoria e cor da paleta.
- [x] Registrar e desfazer conclusão por dia.
- [x] Grade de contribuições com meses, semanas, legenda e seleção de dia.
- [x] Períodos de 3, 6 e 12 meses.
- [x] Sequência atual, maior sequência, total e último registro.
- [x] Proteção contra datas futuras e registros duplicados.
- [x] Persistência real verificada após reinício da aplicação.
- [x] Testes de API, persistência, calendário e formulário.

### Módulo de Diário

- [x] Escrita livre com título opcional, texto e até 10 etiquetas.
- [x] Persistência canônica em Markdown com frontmatter YAML e escrita atômica.
- [x] Índice SQLite apenas com metadados, reconstruível por reindexação.
- [x] Listagem por data, busca textual, filtro por mês e paginação.
- [x] Leitura, edição e exclusão com confirmação e proteção de alterações.
- [x] Reindexação automática quando o índice está vazio e há arquivos.
- [x] Preservação de arquivos malformados e proteção contra caminhos arbitrários.
- [x] Testes de API, persistência, cliente e componentes de UI.

### Operação

- [x] Serviço de build do frontend pelo Flask.
- [x] Script de backup consistente do SQLite.
- [x] Testes e build executados com sucesso.
- [x] Documentação de que o backup do Diário exige cópia de `data/diary/`.
- [x] Launcher desktop com pywebview, janela de controle, abertura no navegador e encerramento do servidor ao fechar.

### Acessibilidade

- [x] Auditoria de contraste sobre estilos computados: zero violações AA nas telas de Início, Atividades, Detalhe e Diário.
- [x] Foco visível em todos os controles, com anel roxo opaco (contorno no menu e no seletor de cor).
- [x] Grade de contribuições com `role="grid"`, roving tabindex, navegação por setas e `Home`/`End`.
- [x] Células de 24 px na grade, com alvo de toque conforme a WCAG 2.5.8.
- [x] Dia de hoje nomeado no rótulo acessível, no `title` e na legenda da grade.
- [x] Foco no primeiro campo com erro, `name`/`autoComplete` nos campos e contadores descritos por `aria-describedby`.
- [x] Aviso de conteúdo não salvo ao sair da página (`beforeunload`), `RouteErrorPage` e cabeçalhos com `text-wrap: balance`.

## Em andamento

Nenhuma frente ativa no momento.

## Planejado

### Atividades — evoluções

- [ ] Exportação do histórico em CSV ou JSON.
- [ ] Filtro e agrupamento por categoria.
- [ ] Arquivamento de atividades sem apagar o histórico.
- [ ] Revisão semanal/mensal com resumo de consistência.
- [ ] Atalhos adicionais de teclado dentro da grade (além de setas, `Home` e `End`).
- [ ] Metas opcionais por atividade.
- [ ] Conquistas e marcos — apenas com dado real, sem gamificação artificial.

### Diário — evoluções

- [ ] Busca full-text local sem varrer todos os arquivos.
- [ ] Backup integrado do banco e de `data/diary/`.
- [ ] Exportação de registros e importação de Markdown existente.
- [ ] Vínculos com o futuro módulo Conhecimento.
- [ ] Editor Markdown com pré-visualização, se houver necessidade concreta.
- [ ] Filtro por etiqueta e navegação por período.

### Conhecimento

- [ ] Notas em Markdown com vínculos e busca local.
- [ ] Referências e anexos.
- [ ] Integração com o contexto de IA.

### Projetos

- [ ] Projetos, etapas, decisões e materiais.
- [ ] Vínculo com atividades e notas.

### IA

- [ ] Definição de modelo local e ferramentas permitidas.
- [ ] Contexto somente leitura sobre `context/` e dados do usuário.
- [ ] Permissões explícitas por ferramenta e trilha de auditoria.
- [ ] Estados honestos de indisponibilidade e configuração.

### Infraestrutura local

- [ ] Backup automático com retenção, incluindo arquivos do Diário.
- [ ] Restauração pela interface.
- [ ] Diagnóstico de banco e migrações na UI.
- [ ] Empacotamento em executável independente, sem exigir ambiente virtual.

## Bloqueado

- **Integração de IA:** depende de escolha de runtime local, modelo, política de ferramentas e limites de segurança. Nenhuma decisão foi tomada; não simular.
- **Autenticação:** deliberadamente adiada enquanto o uso for local e usuário único. Necessária antes de qualquer exposição à rede.
