# Status do laboratório · Universo pessoal

Data: 2026-10-23

Protótipo independente e navegável. Não faz parte da aplicação principal da Elisa e não acessa backend, banco, autenticação ou dados reais.

## O que foi feito

- Criado o app isolado em `experiments/elisa-universe/` com React 19, TypeScript, Vite, Three.js e React Three Fiber.
- Modelados 24 registros fictícios em seis categorias, 26 relações e quatro registros isolados.
- Implementados três modos compartilhando busca, filtros e seleção:
  - **A · Grafo espacial:** nós e conexões em espaço aberto, câmera orbital, seleção por clique e teclado.
  - **B · Universo com ambientes:** seis regiões com esferas, órbitas, rótulos e conexões entre categorias.
  - **C · Grafo 2D:** rede em SVG com pan, zoom, seleção, teclado e botão de centralização.
- Construída a interface completa: cabeçalho, alternância de modos, painel de exploração, busca, filtros por categoria, painel de detalhes, legenda e rodapé.
- Adicionados estados vazios, lista textual acessível, foco visível, navegação por teclado e respeito a `prefers-reduced-motion`.
- Adicionados favicon, identidade visual e aviso permanente de dados fictícios.
- Documentado o protótipo em `README.md`.
- Registrados diagnóstico, contrato preliminar, avaliação técnica e plano em `PROPOSAL.md`.
- Instaladas e fixadas as dependências em `package.json` e `package-lock.json`.
- Adicionados 23 testes unitários para busca, filtros, conexões, layout determinístico, integridade do conjunto fictício e movimento determinístico do grafo 2D.
- Adicionadas camadas de atmosfera: halo aditivo nos astros, no núcleo e nos nós do grafo 2D; partículas viajando pelas conexões com velocidades e defasagens diferentes; rotação automática mais perceptível no modo B e no grafo 2D; e tooltip junto ao cursor nos três modos, incluindo o núcleo “Elisa” no modo B e no centro do grafo 2D.
- Alinhada a moldura da interface à identidade da Elisa real: tokens de fundo e superfície, bordas de 1 px, roxo como foco, Inter Variable e JetBrains Mono Variable locais, marca triangular, controles com raios de 8–12 px e tipografia sem serifa. O fundo das cenas 3D passou a usar `#0B0B0D`; nós, conexões, materiais e cores de categoria foram preservados.

## Correções e ajustes realizados

- Corrigido o uso de `React.PointerEvent` em `App.tsx`.
- Corrigido o spread de tupla na câmera em `CameraRig.tsx`.
- Substituído o uso de `Html` do Drei por rótulos com `CanvasTexture` em sprites, eliminando o erro de `removeChild` no unmount da cena.
- Configurado o listener nativo de roda do mouse com `{ passive: false }` no modo 2D.
- Adicionada câmera adaptativa por proporção da tela, com limites de visão geral.
- Ampliados os planos de neblina e ajustados os tamanhos dos rótulos nos modos 3D.
- Adicionadas proteções de largura no layout e ajuste mobile da barra superior e do botão de visão geral.
- Reduzidos os rótulos das regiões e aproximados do centro em telas estreitas, corrigindo o corte lateral do modo B.
- Extraída a busca e o filtro de `App.tsx` para `lib/universe.ts`, permitindo testes sem montar a cena.
- Implementados no grafo 2D brilho nos nós, partículas nas conexões, tooltip e núcleo central. A rotação lenta usa a mesma cadência do modo B; os rótulos são contrarrotacionados para permanecerem legíveis e as animações SVG são pausadas durante o arrasto.

## Validação

- `npm run check` passou com lint sem avisos/erros, typecheck sem erros, **23 testes unitários aprovados** e build concluído.
- O build gera apenas o aviso de chunk principal acima de 500 kB por causa de `three` e `@react-three/drei`; não é erro.
- QA visual desktop em 1440×900 nos modos A, B e C, sem exceções de runtime.
- QA visual mobile em 390×844 via CDP, sem overflow horizontal; barra superior, abas e ações permanecem dentro da viewport.
- Modo B revalidado em 390×844 com iframe local após o ajuste de câmera e rótulos: nenhuma esfera ou rótulo ficou cortado, mas a cena ocupa menos altura e os rótulos ficam pequenos; a lista e a legenda continuam sendo a leitura confiável nessa largura.
- Halo dos astros, partículas nas conexões e tooltip verificados visualmente nos modos A e B, sem erros de console; no modo B, o núcleo central identifica “Elisa · Núcleo”.
- Modo C revalidado em 1440×900: brilho nos nós, partículas nas conexões, tooltip dos nós, núcleo central com tooltip “Elisa · Núcleo” e rotação lenta com rótulos sempre na vertical. O arrasto pausa as animações SVG; desligar “Movimento” removeu as 33 rotações e as 26 partículas.
- Identidade visual validada em 1440×900 e 390×844 nos modos A, B e C, com painel de detalhes aberto e sem overflow horizontal. A fonte computada é Inter Variable e o fundo é `rgb(11, 11, 13)`.
- Partículas e rotação automática são desligadas quando “Movimento” está inativo ou quando o sistema pede movimento reduzido.
- Verificados seleção de “Atlas de bolso” com seis relações, busca por “estufa” com três resultados e estado vazio de busca.
- Para testar 390 px de largura de verdade, foi necessário usar CDP `Emulation.setDeviceMetricsOverride`; o Chrome headless via linha de comando impõe largura mínima de 500 px.

## O que não foi feito

- Nenhuma integração com a Elisa principal, backend, banco de dados, autenticação ou dados reais.
- Nenhum contrato de dados real implementado, persistência, edição de registros ou edição de relações. O contrato preliminar está documentado, não codificado.
- Nenhum sistema de conta, IA ou integração externa.
- Nenhum teste de UI montada ou E2E; os testes cobrem lógica pura, dados e layout. A validação visual continua manual.
- Nenhuma decisão de produto sobre incorporar o laboratório à aplicação principal.
- Nenhuma otimização de bundle ou divisão de código.
- O ajuste do modo B em telas muito estreitas foi mitigado por escala e posição dos rótulos, mas não foi revalidado em dispositivo físico.

## Como executar

Requisitos: Node.js 20 ou superior.

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
Set-Location experiments\elisa-universe
npm install
npm run dev
```

O Vite usa `http://localhost:5180` por padrão.

## Como verificar

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
# ou
npm run check
```

## Estrutura

```text
experiments/elisa-universe/
├── src/
│   ├── components/
│   │   ├── scene/          # nós, conexões, câmera, regiões, núcleo e campo de estrelas
│   │   ├── scenes/         # modos A, B e C
│   │   ├── DetailsPanel.tsx
│   │   ├── Header.tsx
│   │   ├── Legend.tsx
│   │   ├── Sidebar.tsx
│   │   └── Stage.tsx
│   ├── data/               # registros fictícios e metadados de categorias/modos
│   ├── hooks/              # preferência de movimento reduzido
│   ├── lib/                # layouts, busca/filtros, aleatoriedade determinística e utilidades
│   ├── types/              # contrato local do universo
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── PROPOSAL.md
├── STATUS.md
└── vite.config.ts
```

## Escopo preservado

Todas as alterações desta etapa estão restritas a `experiments/elisa-universe/`. Nenhum arquivo do frontend, backend, rotas, banco ou configuração da Elisa principal foi modificado.
