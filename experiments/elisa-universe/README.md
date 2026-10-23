# Elisa · Universo pessoal

Laboratório visual independente para comparar três formas de navegar por um universo pessoal fictício. Não faz parte da aplicação principal da Elisa: não acessa backend, banco, autenticação ou dados reais.

## Escopo

- 24 registros fictícios em seis categorias: projetos, leituras, hábitos, objetivos, anotações e conquistas.
- 26 relações fictícias, incluindo quatro registros deliberadamente isolados.
- Busca, filtro por categoria, seleção de nós, painel de detalhes e navegação por teclado.
- Halo suave nos astros e nos nós do grafo 2D, partículas animadas pelas conexões e tooltip junto ao cursor nos três modos.
- Núcleo “Elisa” no centro do grafo 2D, com a mesma leitura do núcleo do modo B.
- Rotação automática do modo B e do grafo 2D, mais lenta ou desligada conforme a preferência de movimento. No 2D, os rótulos permanecem na vertical para preservar a leitura.
- Movimento reduzido, respeitando `prefers-reduced-motion`, e alternativa textual completa no painel de exploração.
- Nenhuma persistência, conta, IA ou integração externa.

## Modos

| Modo | Proposta |
| --- | --- |
| A · Grafo espacial | Nós e conexões em um espaço aberto, com câmera orbital. |
| B · Universo com ambientes | Seis regiões com esferas, órbitas e rótulos próprios. |
| C · Grafo 2D | A mesma rede em superfície plana, com pan, zoom e foco por teclado. |

Os filtros e a seleção são compartilhados entre os modos, permitindo comparar a mesma rede em escalas diferentes.

## Identidade visual

A moldura do laboratório segue os tokens da Elisa real: fundo `#0B0B0D`, superfícies `#141417`/`#1C1C21`, bordas `#303036`, texto `#F2F2F4`/`#A0A0AA` e roxo `#8B5CF6` como energia e foco. A interface usa Inter Variable e JetBrains Mono Variable servidas localmente, a marca triangular da Elisa, raios de 8–12 px e bordas de 1 px no lugar de sombras coloridas.

Os grafos mantêm a geometria, os materiais e as cores de categoria já aprovados. A única mudança na cena foi o fundo, alinhado ao neutro da aplicação. O laboratório continua isolado: não importa componentes nem estilos do frontend principal.

O diagnóstico da Elisa real, o contrato preliminar de nós e conexões, a avaliação de renderização e o plano incremental estão em [`PROPOSAL.md`](PROPOSAL.md). O contrato ainda não está implementado.

## Executar

Requisitos: Node.js 20 ou superior.

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
Set-Location experiments\elisa-universe
npm install
npm run dev
```

O Vite abre em `http://localhost:5180` por padrão.

Se o PowerShell bloquear `npm.ps1`:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## Verificar

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
# ou
npm run check
```

Os testes unitários cobrem busca sem acento, filtros, conexões, layout determinístico, integridade do conjunto fictício e movimento determinístico do grafo 2D. O build atual gera um chunk principal acima de 500 kB por causa de `three` e `@react-three/drei`. É um aviso de tamanho, não um erro; otimização com divisão de código pode ser avaliada se o protótipo for incorporado ao produto.

## Estrutura

```text
experiments/elisa-universe/
├── src/
│   ├── components/
│   │   ├── scene/          # nós, conexões, câmera, regiões e campo de estrelas
│   │   ├── scenes/         # modos A, B e C
│   │   ├── DetailsPanel.tsx
│   │   ├── Header.tsx
│   │   ├── Legend.tsx
│   │   ├── Sidebar.tsx
│   │   └── Stage.tsx
│   ├── data/               # dados fictícios e metadados de categorias/modos
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

## Limites conscientes

- Os registros são fictícios e vivem em `src/data/mockUniverse.ts`; um contrato real ainda não existe.
- Relações não estão salvas; são apenas arestas do conjunto de demonstração.
- Os modos A e B usam WebGL. Em máquinas sem aceleração gráfica, a experiência pode ficar lenta; o modo C continua disponível como alternativa.
- O laboratório não altera a Elisa principal. Qualquer integração futura exige decisão de produto, contrato de dados, estados vazios/erro e tratamento de desempenho.
