# Projeto — Elisa

## Finalidade

A Elisa é um ambiente pessoal digital modular. Ela reúne acompanhamento de atividades, um diário pessoal em Markdown, organização do conhecimento, projetos pessoais e, futuramente, uma companheira de IA que compreende o contexto do usuário.

O produto deve parecer um espaço pessoal, não um painel corporativo. A experiência é escura, silenciosa, tipográfica e funcional antes de qualquer integração de IA.

## Público

Uso pessoal, usuário único, na própria máquina. Não há multiusuário, colaboração ou conta externa nesta fase.

## Princípios

1. **Local-first:** dados pessoais permanecem na máquina; o padrão é não enviar nada a terceiros.
2. **Modularidade:** cada funcionalidade tem limites explícitos e pode evoluir sem reescrever o núcleo.
3. **Consistência visual:** módulos compartilham tokens, componentes e padrões de interação.
4. **Documentação viva:** decisões e contexto permanecem em Markdown versionado.
5. **Simplicidade deliberada:** soluções pequenas, explícitas e testáveis antes de abstrações.
6. **Persistência real:** funcionalidade implementada grava e recupera dados de verdade.
7. **Evolução gradual:** complexidade entra quando existe necessidade concreta.
8. **Honestidade:** nada de IA simulada, dados fictícios apresentados como reais ou botões sem comportamento.

## Escopo atual (v0.2.0)

- Fundação frontend e backend com identidade visual monocromática.
- Shell de navegação responsivo com estado real do servidor local.
- Módulo de Atividades:
  - criar, editar e excluir atividades;
  - hábitos binários e mensuráveis;
  - nome, descrição opcional, categoria e cor da paleta;
  - unidades padrão e personalizadas, com conversão apenas na mesma grandeza;
  - meta opcional e frequência diária, semanal ou mensal;
  - registrar e desfazer conclusões ou quantidades por data;
  - múltiplos registros quantitativos por dia, com edição e exclusão;
  - histórico por período em grade de contribuições;
  - sequência, total, progresso do período e médias;
  - resumo de hoje na página inicial;
  - persistência SQLite com migrações.
- Módulo de Mídia:
  - catálogo local de animes, séries, filmes, livros, mangás, jogos, cursos, podcasts e tipos personalizados;
  - gêneros, busca, filtros, ordenação e paginação;
  - estados, avaliação, datas, totais, durações conhecidas e arquivamento;
  - eventos independentes de consumo, incluindo revisitas;
  - progresso separado de revisitas e progresso manual;
  - tempo real, estimado e desconhecido sem mistura;
  - estatísticas por período, tipo, gênero e mês.
- Módulo de Diário:
  - escrita livre com título opcional e etiquetas;
  - arquivos Markdown canônicos em `data/diary/AAAA/MM/`;
  - índice SQLite reconstruível apenas com metadados;
  - busca por título, conteúdo e etiquetas, filtro por mês e leitura em diálogo;
  - edição com proteção contra perda de alterações e exclusão confirmada.
- Documentação de contexto, testes de API e de UI, build de produção local.
- Launcher desktop opcional com pywebview: janela de controle, abertura da Elisa no navegador e encerramento do servidor ao fechar.

## Fora de escopo nesta versão

- Autenticação e multiusuário.
- Sincronização em nuvem ou entre dispositivos.
- Integração real com modelos de IA.
- Conhecimento e Projetos; o módulo de Mídia já faz parte do escopo atual.
- Análise emocional, sugestões automáticas e lembretes no Diário.
- Gamificação, notificações e conquistas.
- Aplicativo móvel nativo.

## Objetivos de longo prazo

- Módulo de conhecimento em Markdown com referências cruzadas.
- Módulo de projetos com etapas, decisões e materiais.
- Exportação e importação de dados.
- Estatísticas e revisões periódicas.
- IA local com ferramentas de leitura controladas, permissões explícitas e registro de ações.
- Backup e restauração pela interface.

## Critérios de sucesso da v0.2.0

- Frontend e backend iniciam corretamente.
- Atividades binárias e mensuráveis persistem após reiniciar, com conversões apenas compatíveis.
- Mídia, eventos e estatísticas persistem após reiniciar, sem inventar tempo ou metadados.
- Registros do Diário persistem como Markdown e o índice pode ser reconstruído.
- A grade reflete apenas registros reais.
- Dias futuros não são tratados como dias perdidos.
- Testes essenciais e build passam.
- Uma pessoa consegue configurar e executar o projeto pelo README.
- A documentação permite que outro agente continue o trabalho.
