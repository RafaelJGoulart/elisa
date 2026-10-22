# Elisa · Universo pessoal

Laboratório visual independente para comparar três formas de navegar por um universo pessoal fictício. Não faz parte da aplicação principal da Elisa: não acessa backend, banco, autenticação ou dados reais.

## Escopo

- 24 registros fictícios em seis categorias: projetos, leituras, hábitos, objetivos, anotações e conquistas.
- 26 relações fictícias, incluindo quatro registros deliberadamente isolados.
- Busca, filtro por categoria, seleção de nós, painel de detalhes e navegação por teclado.
- Movimento reduzido, respeitando `prefers-reduced-motion`, e alternativa textual completa no painel de exploração.
- Nenhuma persistência, conta, IA ou integração externa.

## Modos

| Modo | Proposta |
| --- | --- |
| A · Grafo espacial | Nós e conexões em um espaço aberto, com câmera orbital. |
| B · Universo com ambientes | Seis regiões com esferas, órbitas e rótulos próprios. |
| C · Grafo 2D | A mesma rede em superfície plana, com pan, zoom e foco por teclado. |

Os filtros e a seleção são compartilhados entre os modos, permitindo comparar a mesma rede em escalas diferentes.

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
npm run build
```

O build atual gera um chunk principal acima de 500 kB por causa de `three` e `@react-three/drei`. É um aviso de tamanho, não um erro; otimização com divisão de código pode ser avaliada se o protótipo for incorporado ao produto.

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
│   ├── lib/                # layouts, aleatoriedade determinística e utilidades
│   ├── types/              # contrato local do universo
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
└── vite.config.ts
```

## Limites conscientes

- Os registros são fictícios e vivem em `src/data/mockUniverse.ts`; um contrato real ainda não existe.
- Relações não estão salvas; são apenas arestas do conjunto de demonstração.
- Os modos A e B usam WebGL. Em máquinas sem aceleração gráfica, a experiência pode ficar lenta; o modo C continua disponível como alternativa.
- O laboratório não altera a Elisa principal. Qualquer integração futura exige decisão de produto, contrato de dados, estados vazios/erro e tratamento de desempenho.
