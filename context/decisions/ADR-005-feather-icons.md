# ADR-005 — Feather Icons via componente compartilhado

- Data: 2026-10-21
- Status: Aceita

## Contexto

A identidade visual exige uma única família de ícones, com traço e alinhamento consistentes, e funcionamento offline.

## Problema

Como integrar Feather Icons ao React sem misturar bibliotecas e sem dependência de rede?

## Alternativas consideradas

1. `react-feather` como integração React pronta.
2. Pacote `feather-icons` importando os SVGs locais.
3. Lucide ou outra família.

## Decisão

Usar o pacote oficial `feather-icons`, importar `dist/icons.json` no bundle e renderizar por um componente compartilhado `Icon`. O traço padrão é `1.75`; tamanho, rótulo e classe são explícitos. Nenhuma outra biblioteca de ícones é usada.

## Justificativa

- Fonte oficial, sem dependência de rede em runtime.
- Componente único garante consistência de tamanho, traço e acessibilidade.
- Evita dependência de integração React possivelmente desatualizada.
- O conjunto completo permanece disponível para novos módulos.

## Consequências e limitações

- O JSON completo de ícones entra no bundle (parte do tamanho inicial).
- Nomes são strings; um nome inválido não renderiza nada. Revisar ao adicionar ícones.
- O SVG é inserido como marcação confiável do pacote; nunca a partir de entrada do usuário.
