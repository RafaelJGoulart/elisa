# ADR-007 — Vite no desenvolvimento, Flask no build local

- Data: 2026-10-21
- Status: Aceita

## Contexto

O projeto tem frontend React e backend Flask. Durante o desenvolvimento, o Vite oferece HMR; para uso local, é desejável um único endereço e processo.

## Problema

Como servir o frontend e evitar configuração de CORS ou dois servidores em uso diário?

## Alternativas consideradas

1. Servir o frontend apenas pelo Vite, com proxy para a API.
2. Servir o build do frontend pelo Flask em todos os cenários.
3. Vite no desenvolvimento e Flask servindo `frontend/dist` no uso local.

## Decisão

Desenvolvimento: Vite em `5173` com proxy `/api` para `127.0.0.1:5000`. Uso local consolidado: `npm run build` e Flask servindo `frontend/dist` na mesma origem, com fallback para `index.html`. Rotas `/api/*` nunca são tratadas como SPA.

## Justificativa

- HMR rápido no desenvolvimento.
- Sem CORS: mesma origem em produção local.
- Um único endereço para uso diário.
- Configuração simples, sem servidor web adicional.

## Consequências e limitações

- O uso consolidado exige rebuild do frontend após mudanças.
- O Flask precisa de fallback de SPA e verificação de caminho para evitar traversal.
- `SERVE_FRONTEND=false` desativa o comportamento.
- Para exposição futura à rede, um servidor WSGI de produção e autenticação serão necessários; o servidor de desenvolvimento do Flask não é adequado.
