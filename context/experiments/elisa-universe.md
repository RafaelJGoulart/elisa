# Experimento — Universo pessoal 3D

Status: **laboratório isolado**, sem integração com a aplicação principal e sem decisão de produto.

Pasta: [`experiments/elisa-universe/`](../../experiments/elisa-universe/)

## O que é

App Vite independente, em React 19, TypeScript, Three.js e React Three Fiber, que compara três formas de navegar por um universo pessoal **fictício**:

- **A · Grafo espacial** — nós e conexões em espaço aberto, câmera orbital.
- **B · Universo com ambientes** — seis regiões com esferas e rótulos.
- **C · Grafo 2D** — a mesma rede em SVG, com pan, zoom e teclado.

Não acessa backend, banco, autenticação, Diário ou dados reais. Não persiste nada. Não usa IA.

## Fatos verificados

- O conjunto fictício tem 24 registros em seis categorias e 26 relações, com quatro registros isolados.
- Busca, filtros, seleção e detalhes são compartilhados entre os modos.
- Os astros e os nós do grafo 2D têm halo aditivo; partículas percorrem as conexões com defasagem; o modo B e o grafo 2D giram automaticamente; os três modos mostram uma tooltip junto ao cursor, e o núcleo “Elisa · Núcleo” aparece no modo B e no centro do grafo 2D. No 2D, os rótulos permanecem na vertical durante a rotação.
- A moldura usa os tokens visuais da Elisa real (fundo, superfícies, bordas, roxo, Inter e JetBrains Mono locais) e a marca triangular. Os grafos mantêm geometria, materiais e cores; apenas o fundo das cenas foi alinhado ao neutro da aplicação.
- A lista textual, o foco visível, a navegação por teclado e `prefers-reduced-motion` funcionam como alternativa à cena 3D.
- `npm run check` executa lint, typecheck, 23 testes unitários e build; o único aviso é o chunk acima de 500 kB por causa de Three.js/Drei.
- O modo 3D não é carregado pela aplicação principal; o frontend não possui Three.js.

## Limites conhecidos

- Categorias, relações e conteúdo são fictícios. **Projetos, Objetivos, Conquistas e Conhecimento não existem na Elisa real.**
- Não há contrato de backend implementado, persistência, edição, link profundo nem teste E2E.
- O Diário não possui rota por ID; um link profundo para entrada exigiria mudança no frontend principal.
- A cena 3D pode ser lenta sem aceleração gráfica; o modo 2D é a alternativa.

## Documentos

- [`README.md`](../../experiments/elisa-universe/README.md) — escopo, execução e estrutura.
- [`STATUS.md`](../../experiments/elisa-universe/STATUS.md) — o que foi feito, validação e pendências.
- [`PROPOSAL.md`](../../experiments/elisa-universe/PROPOSAL.md) — diagnóstico da Elisa real, contrato preliminar, avaliação de renderização, plano incremental, riscos e testes necessários.

## Decisão pendente

Incorporar ou não o universo à Elisa principal. Enquanto não houver aprovação, o experimento permanece somente leitura e isolado; nenhum endpoint, migração ou rota da aplicação deve ser criado por causa dele.
