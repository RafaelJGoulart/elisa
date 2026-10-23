# Universo pessoal — diagnóstico, contrato e plano

Data: 2026-10-22

Este documento registra a investigação pedida para o universo visual da Elisa e separa **fatos verificados**, **proposta** e **decisões ainda não tomadas**. O laboratório em `experiments/elisa-universe/` valida a experiência com dados fictícios; nada aqui autoriza integrar a visualização à aplicação principal.

## 1. Diagnóstico da arquitetura atual

### O que existe de verdade

A Elisa é um monólito modular local-first: React + TypeScript + Vite no frontend, Flask com app factory no backend, SQLAlchemy sobre SQLite e Markdown canônico no Diário.

| Fonte | Entidade real | Conteúdo | Ponto de entrada |
| --- | --- | --- | --- |
| SQLite | `Activity` | hábito binário ou mensurável, categoria textual, cor, frequência, arquivamento | `/atividades`, `/atividades/:id` |
| SQLite | `ActivityLog` e `ActivityProgressEntry` | ocorrências e lançamentos quantitativos por data | detalhe da atividade |
| SQLite | `MediaItem` | obra do acervo, tipo, gêneros, estado, progresso, notas | `/midia`, `/midia/:id` |
| SQLite | `MediaType` e `Genre` | tipo configurável e gênero reutilizável | filtros do acervo |
| SQLite | `MediaConsumptionEvent` | consumo independente por data, unidade e duração | detalhe da mídia |
| SQLite | `DiaryEntry` | apenas índice de metadados; o corpo vive em Markdown | `/diario` |
| SQLite | `XpEvent` | extrato append-only de EXP originado por hábitos | `/perfil` |

Não existem, hoje, entidades de **Projetos**, **Objetivos**, **Conquistas** ou **Conhecimento**. Elas aparecem na navegação como estado planejado, sem implementação. O laboratório usa essas categorias como ficção declarada; um contrato real não pode tratá-las como dados disponíveis.

### Relações explícitas hoje

| Origem | Destino | Natureza | Existe? |
| --- | --- | --- | --- |
| `Activity` | categoria textual | agrupamento por campo | Sim |
| `MediaItem` | `MediaType` | chave estrangeira | Sim |
| `MediaItem` | `Genre` | tabela de junção | Sim |
| `MediaItem` | `MediaConsumptionEvent` | composição | Sim |
| `Activity` | `ActivityLog` / `ActivityProgressEntry` | composição | Sim |
| `DiaryEntry` | etiquetas textuais | lista no frontmatter | Sim, mas são strings |
| `XpEvent` | `Activity` | `activity_id` opcional | Sim |
| Registro de um módulo | registro de outro módulo | — | **Não existe** |

Consequência central: **não há vínculo entre hábito, mídia, diário e perfil**. Um grafo real começa como ilhas por categoria/tipo/gênero. Qualquer ponte entre módulos exigiria modelagem nova e decisão de produto; o laboratório não deve sugerir o contrário.

### Capacidade de abrir o registro original

- `/atividades/:id` e `/midia/:id` abrem o detalhe por URL.
- `/diario` lista e abre registros no próprio painel, mas **não há rota por ID**. Um link profundo para uma entrada exigiria ajuste no frontend.
- `/perfil` é uma visão agregada, não um registro.

### Dependências de visualização

O frontend principal não usa Three.js, React Three Fiber nem biblioteca de grafo. O laboratório é o único lugar com `three`, `@react-three/fiber` e `@react-three/drei`, em app Vite separado na porta 5180. Não há persistência, API ou dado real no laboratório.

## 2. Proposta de experiência

O universo deve ser uma **camada de leitura** sobre as fontes existentes. Ele não cria uma segunda verdade, não move registros entre módulos e não edita nada ao orbitar, selecionar ou filtrar.

### Estrutura de leitura

1. **Núcleo** — identidade e progressão (perfil/EXP), sem virar nó editável.
2. **Regiões** — agrupamentos factuais: categoria de hábito, tipo de mídia, gênero e etiqueta do Diário.
3. **Registros** — hábitos, obras e entradas do Diário, com identificador estável e referência ao original.

Cada nó deve ser recuperável pelo registro que representa. O grafo carrega apenas o necessário para orientar a leitura: título, tipo, data, etiquetas, peso visual e referência. O conteúdo completo continua nos endpoints e arquivos atuais.

### Modos complementares

| Modo | Papel | Padrão |
| --- | --- | --- |
| Lista / grafo 2D | leitura completa, teclado, busca, filtros e baixo custo | **padrão** |
| Grafo espacial 3D | visão de conjunto e exploração por proximidade | opcional |
| Universo com ambientes | futura navegação temática por regiões | experimental |

O modo 3D nunca deve ser o único caminho. A cena WebGL fica `aria-hidden`, com lista textual equivalente, e respeita `prefers-reduced-motion`. Movimento automático é desligado por padrão nesse caso. Cor não pode ser o único diferenciador de tipo.

### Ambientes temáticos futuros

Um ambiente não deve ser um novo app nem um objeto 3D por registro. A proposta é um **descritor de apresentação** por região:

- cor e intensidade de fundo;
- neblina, iluminação e campo de estrelas;
- geometria de contorno da região;
- ponto de ancoragem da câmera;
- rótulo e descrição.

O descritor é opcional e puramente visual. Navegar entre ambientes é mover a câmera entre âncoras e trocar o descritor, mantendo o mesmo contrato de nós e conexões. Nenhuma coleção completa de ambientes deve ser implementada antes de existir dado real que a justifique.

## 3. Contrato preliminar

O contrato é independente de Three.js e de qualquer layout. Pode alimentar 3D, 2D ou lista.

```ts
type UniverseNodeKind = 'activity' | 'media' | 'diary'
type UniverseAreaKind = 'activity-category' | 'media-type' | 'media-genre' | 'diary-tag'
type UniverseEdgeKind =
  | 'categorized_as'
  | 'of_type'
  | 'has_genre'
  | 'tagged_with'

interface UniverseRef {
  module: 'activities' | 'media' | 'diary'
  id: string
  path: string        // rota existente; nunca um endpoint novo
}

interface UniverseNode {
  id: string          // ex.: activity:12
  kind: UniverseNodeKind
  title: string
  subtitle?: string
  date?: string       // YYYY-MM-DD, quando existir
  tags: string[]
  ref: UniverseRef
}

interface UniverseArea {
  id: string          // ex.: area:media-genre:fantasia
  kind: UniverseAreaKind
  label: string
  description?: string
}

interface UniverseEdge {
  id: string
  kind: UniverseEdgeKind
  source: string
  target: string
  label: string
}

interface UniversePayload {
  version: 1
  generatedAt: string // UTC ISO 8601 com Z
  nodes: UniverseNode[]
  areas: UniverseArea[]
  edges: UniverseEdge[]
  unavailable: Array<'projects' | 'goals' | 'achievements' | 'knowledge'>
}
```

Regras do contrato:

- `id` é estável e prefixado por módulo; nunca reutiliza posição de layout.
- `ref.path` aponta para a interface existente. Enquanto o Diário não tiver rota por ID, `path` é `/diario` e o ID fica em `ref.id`; isso é uma limitação declarada, não um link profundo falso.
- O payload não inclui corpo do Diário, notas completas, histórico inteiro nem segredo algum. Detalhes são buscados nos endpoints atuais quando o usuário seleciona um nó.
- Conexões só podem ser derivadas de relações explícitas da tabela da seção 1. Não inferir relação por etiqueta parecida, cor igual ou coincidência textual.
- Registros sem relação aparecem isolados, sem aresta inventada.
- `unavailable` permite que a interface mostre estados honestos em vez de categorias vazias fingindo existir.
- Sem `weight` no contrato: o tamanho visual pode ser derivado do grau ou da recência no cliente, desde que a regra seja documentada e não vire dado persistido.

Mapeamento do laboratório para o real:

| Laboratório | Real |
| --- | --- |
| Hábitos | `Activity` |
| Leituras | `MediaItem` de tipos compatíveis (livro, mangá etc.) |
| Anotações | `DiaryEntry` |
| Projetos, Objetivos, Conquistas | indisponíveis |
| Categorias fixas | áreas derivadas de categoria, tipo, gênero e etiqueta |

## 4. Avaliação técnica de renderização

| Opção | Vantagens | Limites | Uso recomendado |
| --- | --- | --- | --- |
| React Three Fiber + three (laboratório) | integração React, câmera e materiais declarativos, ecossistema Drei | bundle alto, WebGL obrigatório, testes de cena difíceis | modo 3D opcional, com import dinâmico |
| three puro | controle e bundle um pouco menores | ciclo de vida manual, mais código imperativo | se R3F se mostrar custoso |
| SVG/Canvas 2D | acessível, testável, barato, funciona sem GPU | menos atmosférico | modo padrão e fallback |
| CSS 3D | sem dependências | limitado para rede e câmera real | nunca para o grafo principal |
| Babylon.js | recursos de cena e ferramentas | peso e paradigma adicionais sem ganho claro aqui | não recomendado nesta escala |

O build atual do laboratório mede **1.210,78 kB de JS (334,79 kB gzip)** e emite aviso de chunk acima de 500 kB por causa de `three`/Drei. Para 24 nós isso é aceitável em laboratório, mas inaceitável como custo inicial da aplicação. Se adotado, o modo 3D deve ser carregado sob demanda e o modo 2D/lista deve funcionar sem baixar Three.js.

## 5. Plano incremental

Nenhuma etapa abaixo está autorizada por este documento; cada uma exige aprovação.

1. **Aprovar escopo e contrato.** Confirmar que o universo é somente leitura e quais tipos entram na primeira versão.
2. **Contrato real no backend.** Serviço e repository somente leitura, sem migração, gerando `UniversePayload` a partir de atividades, mídia e Diário. Rotas não contêm SQL; testes de serialização cobrem IDs, referências e ausência de conteúdo.
3. **Frontend em modo lista/2D.** Nova feature com rota `/universo`, carregada de forma preguiçosa, usando os componentes e tokens existentes.
4. **Modo 3D opcional.** Import dinâmico de Three/R3F, câmera, seleção e detalhes; fallback automático em erro de WebGL.
5. **Busca, filtros e vínculo com o original.** Reutilizar os padrões de Atividades/Mídia/Diário; resolver antes o link profundo do Diário ou declarar a limitação na interface.
6. **Acessibilidade e desempenho.** Lista equivalente, teclado, foco, contraste, movimento reduzido, limites de nós e teste em máquina sem GPU.
7. **Ambientes temáticos.** Somente depois de dados reais e de decisão sobre regiões; começar por descritores, não por coleções de cenas.

Arquivos previstos, se aprovado: `backend/app/api/universe.py`, `backend/app/services/universe_service.py`, `backend/app/repositories/universe_repository.py`, `backend/app/api/serializers.py`, `frontend/src/features/universe/`, `frontend/src/services/universe.ts` e a rota em `frontend/src/app/router.tsx`. Nenhuma migração de banco é necessária para a leitura.

## 6. Riscos e decisões pendentes

### Riscos

- **Grafo vazio ou fragmentado:** sem relações entre módulos, a primeira versão terá apenas ilhas. Isso é honesto, mas pode decepcionar quem espera uma rede densa.
- **Falsa impressão de relação:** agrupar por gênero ou etiqueta não significa que dois registros se influenciam. A interface deve rotular a aresta como agrupamento.
- **Excesso de áreas:** etiquetas e gêneros podem gerar centenas de nós de área. É preciso decidir limite, agrupamento ou ocultação.
- **Segunda fonte de verdade:** qualquer cache persistido, edição no grafo ou cópia de conteúdo viola a arquitetura.
- **Acessibilidade:** WebGL não é lido por leitores de tela e pode causar desconforto; a lista/2D precisa ser completa, não um resumo.
- **Desempenho:** o custo do bundle e o número de nós crescem com o uso real; rótulos e conexões são o gargalo visual.
- **Link profundo do Diário:** hoje não existe rota por ID; o contrato não pode prometer o que a interface não entrega.
- **Escopo de produto:** incorporar o laboratório sem decisão transforma um experimento em dívida de manutenção.

### Decisões pendentes

1. O universo será uma tela real da Elisa ou permanece laboratório?
2. Qual modo é padrão para uso cotidiano: lista/2D ou 3D?
3. Quais tipos entram primeiro: hábitos, mídia, Diário ou apenas um?
4. Áreas por categoria, tipo e gênero entram na primeira versão? Etiquetas também?
5. Qual o limite de nós antes de agrupar ou paginar?
6. O Diário ganhará rota por ID para permitir link profundo?
7. Ambientes temáticos são parte do produto ou apenas estudo visual?

## 7. Testes necessários

- Contrato: IDs estáveis, prefixos corretos, `ref.path` existente, nenhum corpo de Diário ou nota no payload.
- Derivação: apenas relações explícitas; registro sem vínculo permanece isolado.
- Vazio: banco sem atividades, mídia ou Diário retorna payload válido e a interface mostra estado honesto.
- Volume: muitos registros, etiquetas e gêneros sem travar a montagem.
- Frontend: busca sem acento, filtros combinados, seleção, limpeza e detalhes.
- Acessibilidade: navegação por teclado, foco visível, lista equivalente, movimento reduzido e fallback sem WebGL.
- Regressão: nenhuma rota existente muda de contrato; nenhum dado é gravado ao navegar.
- Visual: 2D e 3D representam o mesmo conjunto após filtros.

## 8. O que o laboratório já validou

- Três modos compartilhando busca, filtros e seleção.
- Nós com geometria e cor por tipo, conexões distinguíveis e painel de detalhes.
- Lista textual completa, teclado, foco visível e `prefers-reduced-motion`.
- Grafo 2D como alternativa ao WebGL.
- Estados vazios e aviso permanente de dados fictícios.
- Build, lint, typecheck, 21 testes unitários e QA visual desktop/mobile.

O laboratório **não** validou dados reais, contrato de backend, persistência, link profundo, desempenho com volume real nem aprovação de produto.
