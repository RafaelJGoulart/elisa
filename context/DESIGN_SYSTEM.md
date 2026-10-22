# Design System — Elisa

## Sensação desejada

Interface escura, silenciosa e sofisticada. Superfícies neutras, tipografia clara e cor usada como energia: aparece em estados ativos, indicadores, progresso e identidade dos módulos, nunca como decoração indiscriminada.

Princípios:

- Monocromático por padrão; cor com motivo.
- Contraste e legibilidade antes de efeito.
- Movimento discreto e respeitoso à preferência do sistema.
- Estados nunca dependem apenas de cor: sempre há texto, ícone, padrão ou rótulo acessível.

## Paleta

Tokens definidos em `frontend/src/styles/globals.css` (`:root` e `@theme inline`). A referência visual original está em `paleta-cores.html` na raiz.

### Neutros

| Token | Hex | Uso |
| --- | --- | --- |
| `--background` | `#0B0B0D` | Fundo principal da aplicação. |
| `--surface` / `--card` | `#141417` | Cards, painéis e sidebar translúcida. |
| `--surface-raised` | `#1C1C21` | Elementos elevados, popovers, trilhas e hover. |
| `--border` / `--input` | `#303036` | Bordas discretas, divisórias e inputs. |
| `--text-primary` / `--foreground` | `#F2F2F4` | Texto principal. |
| `--text-secondary` / `--muted-foreground` | `#A0A0AA` | Descrições e apoio. |
| `--text-disabled` | `#8A8A96` | Texto inativo, placeholders e estados desabilitados. Subiu de `#666670` para atingir contraste AA em corpo pequeno. |

### Cores de energia

| Chave | Nome | Hex |
| --- | --- | --- |
| `purple` | Roxo | `#8B5CF6` |
| `magenta` | Magenta | `#EC4899` |
| `red` | Vermelho | `#F43F5E` |
| `green` | Verde | `#4ADE80` |
| `blue` | Azul | `#60A5FA` |
| `yellow` | Amarelo | `#FACC15` |
| `orange` | Laranja | `#FB923C` |

`purple` é a cor de marca e de foco (`--primary`, `--ring`). Cada atividade escolhe uma chave; o backend valida a chave, não o hexadecimal. Trocar a paleta no futuro afeta todos os dados existentes sem migração.

### Ajuste de contraste documentado

- Texto sobre botões primários e destrutivos usa `#0B0B0D` (`--primary-foreground` / `--destructive-foreground`), não branco. O roxo e o vermelho da paleta não atingem contraste AA confortável com texto branco pequeno; com texto escuro, o contraste sobe e a interface permanece consistente.
- Texto secundário atende leitura normal sobre o fundo. `--text-disabled` é reservado a conteúdo inativo, nunca a informação essencial.
- `--text-disabled` foi elevado de `#666670` para `#8A8A96`. O valor anterior rendia 3,24:1 sobre `--surface` e falhava em AA (4,5:1) para corpo pequeno; o novo valor rende 5,39:1 sobre `--surface`, 4,98:1 sobre `--surface-raised` e 5,76:1 sobre `--background`.
- Informação que precisa ser lida — legendas, contadores, rótulos auxiliares — migrou de `text-text-disabled` para `text-text-secondary` (`#A0A0AA`, 7,09:1 sobre `--surface`). `--text-disabled` ficou restrito a conteúdo genuinamente inativo: placeholders, ícones decorativos, itens desabilitados e o status "planejado".
- O anel de foco usa `--ring` opaco (4,64:1 sobre `--background`). Versões com opacidade reduzida ficavam abaixo de 3:1 e não atendiam ao contraste mínimo de indicador de foco.
- Auditoria de contraste é feita sobre os estilos computados no navegador, não apenas sobre o CSS compilado: compõe as camadas de fundo até uma opaca e aplica o limiar WCAG (4,5:1 para texto normal, 3:1 para texto grande).

## Tipografia

- **Interface:** Inter Variable (`@fontsource-variable/inter`), servida localmente pelo bundle.
- **Dados técnicos:** JetBrains Mono Variable (`@fontsource-variable/jetbrains-mono`) para números, datas, contadores e tokens.
- Fallback: `system-ui`, `-apple-system`, sem dependência de rede em runtime.

Escala usada:

| Papel | Classes típicas |
| --- | --- |
| Título de página | `text-2xl sm:text-3xl font-semibold tracking-tight` |
| Título de seção | `text-sm font-semibold` |
| Corpo | `text-sm leading-relaxed` |
| Apoio | `text-xs leading-relaxed text-text-secondary` |
| Rótulo/eyebrow | `text-[11px] uppercase tracking-[0.12em] text-text-secondary` |
| Dados | `font-mono text-sm` |

## Espaçamento, raios e sombras

- Grid base de 4 px (Tailwind).
- Ramos principais: 12 px (`rounded-xl`) para cards e diálogos; 8 px (`rounded-md`) para controles; 6 px (`rounded-lg`) para popovers.
- Conteúdo máximo: `max-w-6xl`, com respiro `px-4 py-8` a `px-10 py-12`.
- Sombras apenas em camadas elevadas (dialogs, menus, toasts); sem sombras coloridas.
- Superfícies usam borda de 1 px como principal separador.

## Ícones

- Biblioteca **Feather Icons** (`feather-icons`), sem mistura com Lucide ou outras famílias.
- Uso centralizado em `src/components/shared/Icon.tsx`, que renderiza o SVG local, com `strokeWidth` padrão `1.75` e tamanhos de 11 a 26 px conforme contexto.
- Ícones decorativos são `aria-hidden`; ícones com significado recebem `label`.
- Botões apenas com ícone sempre têm `aria-label` e tooltip quando o símbolo não é óbvio.
- Nomes Feather são referenciados por string (`activity`, `calendar`, `trash-2`).

## Componentes

Base no estilo shadcn/ui, com Radix UI para comportamento acessível:

- `Button` — variantes `default` (roxo), `destructive`, `outline`, `secondary`, `ghost`, `link`; tamanhos `sm`, `default`, `lg`, `icon`. `type="button"` é o padrão; `type="submit"` é explícito nos formulários e o `type` não é injetado no elemento filho quando `asChild` é usado.
- `Dialog` — formulários e criação/edição; fundo `surface`, overlay escuro com blur leve.
- `AlertDialog` — confirmação de exclusão com ação destrutiva explícita.
- `DropdownMenu` — ações secundárias (editar, excluir, abrir). O item focado recebe contorno roxo de 2 px com offset interno e fundo `primary/15`.
- `Input`, `Textarea`, `Label` — foco visível com anel opaco (`--ring`), erro com `aria-invalid` e borda vermelha, mensagem associada por `aria-describedby`.
- `Tooltip` — status do servidor e controles ambíguos.
- `Badge` — estados (`success`, `warning`, `danger`, `secondary`, `outline`).
- `Skeleton` — carregamento sem layout shift.
- `Separator`, `Select` — prontos para futuros módulos.

Compartilhados:

- `AppShell` — sidebar, navegação móvel, skip link, indicador de saúde local.
- `PageHeader` — título, descrição, eyebrow e ações.
- `EmptyState`, `LoadingState`, `ErrorState` — estados padronizados; `EmptyState` e `ErrorState` aceitam `headingLevel` para virar `h1` quando ocupam a página inteira.
- `ToastProvider` (`shared/ToastProvider.tsx`) e `useToast` (`shared/toast-context.ts`) — feedback com `aria-live`.
- `ColorSwatchPicker` — seleção acessível de cor por rádio nativo.
- `ActivityStats`, `ActivityCard`, `ContributionCalendar`, `MiniContributionGrid`.
- `DiaryComposer`, `DiaryEntryList`, `DiaryEntryDialog`, `DiaryEditorDialog`, `DeleteDiaryEntryDialog`.

## Grade de contribuições

- Colunas representam semanas (domingo a sábado); linhas, dias da semana.
- Célula de 24 px com 3 px de espaçamento (passo de 27 px); rolagem horizontal em telas estreitas. O alvo de 24×24 px atende à WCAG 2.5.8 sem depender da exceção de espaçamento.
- Estados:
  - **Concluído:** cor da atividade, sólida.
  - **Sem registro:** `surface-raised` com borda `border`.
  - **Futuro:** fundo hachurado e borda; nunca contado como falha.
  - **Hoje:** borda `text-secondary`, visível mesmo em célula concluída.
  - **Selecionado:** anel de 2 px com `foreground` e offset.
- Meses abreviados em pt-BR acima das colunas; dias da semana `Seg`, `Qua`, `Sex` à esquerda para reduzir ruído.
- A grade segue a semântica `role="grid"` → `role="row"` → `role="gridcell"`, com o botão dentro da célula. Apenas uma célula é alcançável pelo Tab (roving tabindex); as setas movem o foco em dia e em semana, e `Home`/`End` vão ao início e ao fim da semana. O foco nunca sai do período exibido.
- Cada célula é um botão com `aria-label` completo (data por extenso + estado + `hoje` quando aplicável), `aria-pressed` e `title`. A legenda textual repete os estados, incluindo `Hoje`.
- O painel lateral mostra a data selecionada, estado, horário do registro e ação de registrar/desfazer.

## Diário

- Layout em duas colunas no desktop: compositor à esquerda; busca, filtro e lista à direita. Em telas menores, o compositor vem primeiro.
- O compositor privilegia escrita: título opcional, textarea ampla, contador discreto e etiquetas com prévia em `Badge`.
- A lista agrupa por data (`Hoje`, `Ontem`, data por extenso) e usa hora em `font-mono`, título e excerpt de até duas linhas.
- Registros são botões de linha inteira, com estados hover e selecionado; nunca há ação destrutiva em um clique.
- O diálogo de leitura exibe o texto com `whitespace-pre-wrap` e ações de editar, excluir e fechar.
- O editor ocupa até `max-w-2xl`, com rolagem vertical e confirmação ao fechar com alterações não salvas.
- Busca com debounce, limpeza explícita e filtro por mês; o mês ativo aparece na URL.
- Falha de salvamento mantém o texto digitado e mostra alerta inline; não fecha o diálogo nem descarta conteúdo.
- O aviso local-first é textual, discreto e não promete sincronização.

## Janela de controle desktop

- O launcher é uma janela pequena de operação, não a interface principal. A interface React continua no navegador e nunca é carregada dentro do pywebview.
- A composição usa marca, estado do serviço, endereço local e as ações **Abrir Elisa** e **Encerrar Elisa**, em um painel escuro com `surface`, borda de 1 px e raio de 12 px.
- O endereço aparece em fonte mono, em uma superfície elevada e selecionável.
- Os estados são iniciando, em execução, instância externa, erro e encerrando. Cada um combina texto, título e ponto de estado; a cor nunca é o único indicador.
- **Abrir Elisa** é a ação primária roxa; **Encerrar Elisa** é secundária com hover destrutivo. Durante a inicialização ou o encerramento, as ações ficam desabilitadas.
- Em erro, a mensagem é exibida no painel e **Tentar novamente** fica disponível. O botão de encerramento vira **Fechar launcher** quando não há servidor próprio para parar.
- O launcher respeita `prefers-reduced-motion` e não usa fontes ou ícones remotos.

## Estados e feedback

- Carregamento: skeletons com `aria-busy`.
- Vazio: ícone, título, explicação e ação primária.
- Erro: mensagem clara, ícone de alerta e botão de nova tentativa.
- Erro de rota (falha do React Router) tem página própria (`RouteErrorPage`) com título, mensagem e volta ao início.
- Sucesso/erro de mutação: toast com ícone e texto.
- Exclusão: confirmação obrigatória com aviso de perda de histórico ou remoção de arquivo.
- Edição com alterações pendentes: confirmação antes de descartar.
- Nenhuma ação destrutiva ocorre em um clique.

## Acessibilidade

- Navegação completa por teclado; foco visível em todos os controles, com anel roxo opaco de 2 px (contorno ou `ring`, conforme o componente).
- `skip link` para o conteúdo principal.
- Rótulos reais em campos, `name` e `autoComplete` em todos os campos de formulário, e `aria-describedby` para erros e contadores de caracteres.
- Ao falhar a validação, o foco vai para o primeiro campo com erro (`focusFirstErroredField`, em `src/lib/focus.ts`), na ordem visual do formulário.
- Alvos de toque de no mínimo 24×24 px; a grade de contribuições usa células de 24 px.
- Contraste: texto principal e secundário sobre fundo escuro; botões com texto escuro sobre cores vibrantes. Nenhum texto fica abaixo de 4,5:1.
- Estados não comunicados apenas por cor: a grade nomeia "hoje" no rótulo acessível, no `title` e na legenda.
- Semântica de grade: `role="grid"` na grade, `aria-label` no contêiner, `aria-selected` na célula e `aria-pressed` no botão.
- Respeito a `prefers-reduced-motion` (transições reduzidas a quase zero; rolagem suave desativada quando o sistema pede).
- Conteúdo não salvo avisa o navegador com `beforeunload` (`useUnsavedChangesWarning`), além do diálogo de descarte dentro do aplicativo.
- `touch-action: manipulation` evita o zoom acidental por duplo toque, preservando o zoom por pinça.
- Áreas seguras do sistema (`env(safe-area-inset-*)`) são respeitadas no cabeçalho e no rodapé do conteúdo.
- Cabeçalhos usam `text-wrap: balance`; números em `font-mono` usam algarismos tabulares.
- Navegação móvel em menu acessível, com itens planejados desabilitados e rotulados.
- Datas em português do Brasil.

## Como alterar o design system

1. Ajuste tokens em `globals.css`, não valores soltos em componentes.
2. Atualize este documento e, se a mudança for estrutural, registre um ADR.
3. Verifique contraste, foco, estados de erro e responsividade.
4. Rode `npm run build`, `npm test` e `npm run lint`.
