# Skill — Atualizar a documentação

## Mapa de mudança → documento

| Mudança | Atualizar |
| --- | --- |
| Novo módulo ou funcionalidade | `modules/<modulo>.md`, `MODULES.md`, `ROADMAP.md`, `INDEX.md` |
| Endpoint ou contrato | `ARCHITECTURE.md`, documento do módulo |
| Token, componente ou padrão visual | `DESIGN_SYSTEM.md` |
| Regra de código, data, validação ou teste | `CONVENTIONS.md` |
| Formato de arquivo canônico ou indexação | ADR, `modules/<modulo>.md`, skill `markdown-persistence` |
| Decisão estrutural | novo ADR em `decisions/` + `DECISIONS.md` |
| Instalação, comando ou estrutura | `README.md`, `AGENTS.md` |
| Procedimento repetível | `skills/` |

## Checklist

- [ ] O documento descreve o comportamento **real**, não a intenção.
- [ ] Links relativos funcionam.
- [ ] `INDEX.md` aponta para novos documentos.
- [ ] `ROADMAP.md` não marca como concluído algo sem teste/validação.
- [ ] Nenhum segredo, token, dado pessoal ou caminho sensível foi adicionado.
- [ ] O conteúdo não duplica outro documento; referencia.
- [ ] Limitações e débitos técnicos foram registrados.
- [ ] Documentação contraditória com o código foi corrigida.

## Estilo

- Markdown simples, títulos curtos, tabelas quando ajudam.
- Português do Brasil.
- Exemplos de comando em PowerShell.
- Datas absolutas (`AAAA-MM-DD`) em decisões e marcos.
