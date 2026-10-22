# Skill — Criar ou alterar UI React

## Antes

1. Leia [DESIGN_SYSTEM](../DESIGN_SYSTEM.md) e [CONVENTIONS](../CONVENTIONS.md).
2. Verifique componentes existentes em `src/components/ui/` e `src/components/shared/`.
3. Prefira compor com o que existe antes de criar outro padrão.

## Estrutura

- Página de módulo em `src/features/<modulo>/pages/`.
- Componentes específicos em `src/features/<modulo>/components/`.
- Busca de dados via `services/` + `useAsyncResource`; nunca `fetch` direto.
- Regra de negócio fica no backend.
- Unidades de hábito vêm de `/api/units`; unidades aceitas por tipo de mídia vêm de `type.units`. Não replique conversões ou tabelas de compatibilidade no frontend.
- Quantidades usam `lib/format.ts`; tempo real, estimado e desconhecido têm rótulos e estilos distintos.
- Datas de registro vêm da API em `YYYY-MM-DD`; use `lib/dates.ts` em vez de `toISOString()`.

## Checklist visual

- [ ] Usa tokens (`bg-surface`, `border-border`, `text-text-secondary`) em vez de hex solto.
- [ ] Cor vibrante apenas com propósito (estado, identidade, progresso).
- [ ] Estados de carregamento, vazio e erro implementados.
- [ ] Feedback de sucesso/erro em mutações.
- [ ] Confirmação antes de ação destrutiva.
- [ ] Foco visível e navegação por teclado.
- [ ] Rótulos em campos e `aria-label` em botões de ícone.
- [ ] `name` e `autoComplete` em todos os campos de formulário.
- [ ] Falha de validação leva o foco ao primeiro campo com erro.
- [ ] Alvos de toque de no mínimo 24×24 px.
- [ ] Contraste adequado (texto escuro sobre primário/destrutivo) e nenhum texto abaixo de 4,5:1.
- [ ] Estado nunca comunicado apenas por cor.
- [ ] Responsivo em 360 px, tablet e desktop; rolagem horizontal onde necessário.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Sem ícones de outra biblioteca; use `Icon`.

## Componentes

- Base: `Button`, `Input`, `Textarea`, `Label`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Tooltip`, `Badge`, `Skeleton`.
- Compartilhados: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `ToastProvider`, `ColorSwatchPicker`.

## Testes

- Formulários: envio válido, erros de validação, estado de edição.
- Componentes interativos: seleção, estados e ações.
- Diálogos de quantidade e consumo: payload correto, unidade obrigatória e erros.
- Injete datas fixas (prop `today`) em vez de depender do relógio.

```powershell
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```
