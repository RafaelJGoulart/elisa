# ADR-008 — Sem autenticação na versão local

- Data: 2026-10-21
- Status: Aceita

## Contexto

A v0.1.0 é uma aplicação pessoal, de usuário único, executada na própria máquina.

## Problema

Implementar autenticação agora ou manter o acesso local sem login?

## Alternativas consideradas

1. Login com senha e sessão desde o início.
2. Token local simples.
3. Sem autenticação, com bind em loopback e documentação explícita de risco.

## Decisão

Não implementar autenticação nesta versão. O servidor escuta `127.0.0.1` por padrão. A documentação declara que a aplicação não deve ser exposta à rede sem autenticação, HTTPS e revisão de segurança.

## Justificativa

- Autenticação sem requisito concreto adicionaria complexidade e fricção.
- O risco é aceitável no escopo local e usuário único.
- O modelo pode ser adicionado depois sem alterar o domínio de atividades.

## Consequências e limitações

- Qualquer processo local com acesso ao endereço pode usar a API.
- Não há multiusuário nem isolamento de dados.
- Antes de qualquer exposição à rede: adicionar autenticação, proteção CSRF quando aplicável, HTTPS, limites de taxa, política de backup e revisão das fronteiras de segurança.
