# Status do laboratório · Universo pessoal

Data: 2026-10-22

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
- Instaladas e fixadas as dependências em `package.json` e `package-lock.json`.

## Correções e ajustes realizados

- Corrigido o uso de `React.PointerEvent` em `App.tsx`.
- Corrigido o spread de tupla na câmera em `CameraRig.tsx`.
- Substituído o uso de `Html` do Drei por rótulos com `CanvasTexture` em sprites, eliminando o erro de `removeChild` no unmount da cena.
- Configurado o listener nativo de roda do mouse com `{ passive: false }` no modo 2D.
- Adicionada câmera adaptativa por proporção da tela, com limites de visão geral.
- Ampliados os planos de neblina e ajustados os tamanhos dos rótulos nos modos 3D.
- Adicionadas proteções de largura no layout e ajuste mobile da barra superior e do botão de visão geral.

## Validação

- `npm run check` passou com lint sem avisos/erros, typecheck sem erros e build concluído.
- O build gera apenas o aviso de chunk principal acima de 500 kB por causa de `three` e `@react-three/drei`; não é erro.
- QA visual desktop em 1440×900 nos modos A, B e C, sem exceções de runtime.
- QA visual mobile em 390×844 via CDP, sem overflow horizontal; barra superior, abas e ações permanecem dentro da viewport.
- Verificados seleção de “Atlas de bolso” com seis relações, busca por “estufa” com três resultados e estado vazio de busca.
- Para testar 390 px de largura de verdade, foi necessário usar CDP `Emulation.setDeviceMetricsOverride`; o Chrome headless via linha de comando impõe largura mínima de 500 px.

## O que não foi feito

- Nenhuma integração com a Elisa principal, backend, banco de dados, autenticação ou dados reais.
- Nenhum contrato de dados real, persistência, edição de registros ou edição de relações.
- Nenhum sistema de conta, IA ou integração externa.
- Nenhum teste automatizado próprio de UI ou E2E; a validação foi feita por lint, typecheck, build e QA visual headless.
- Nenhuma decisão de produto sobre incorporar o laboratório à aplicação principal.
- Nenhuma otimização de bundle ou divisão de código.
- O modo B em telas muito estreitas ainda pode encostar ou cortar rótulos/esferas nas laterais; o desktop está estável e o ajuste fino ficou pendente.

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
│   ├── lib/                # layouts, aleatoriedade determinística e utilidades
│   ├── types/              # contrato local do universo
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.ts
```

## Escopo preservado

Todas as alterações desta etapa estão restritas a `experiments/elisa-universe/`. Nenhum arquivo do frontend, backend, rotas, banco ou configuração da Elisa principal foi modificado.
