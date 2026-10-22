const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

/** Formata quantidades decimais no padrão pt-BR sem zeros à direita. */
export function formatDecimal(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits,
  }).format(value)
}

/** Formata uma quantidade acompanhada do símbolo da unidade. */
export function formatAmount(value: number, symbol?: string | null): string {
  const formatted = formatDecimal(value)
  return symbol ? `${formatted} ${symbol}` : formatted
}

/** Converte minutos em uma duração curta e legível (ex.: "2 h 15 min"). */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const remaining = total % 60
  if (hours > 0 && remaining > 0) return `${hours} h ${remaining} min`
  if (hours > 0) return `${hours} h`
  return `${remaining} min`
}

/** Percentual limitado ao intervalo 0–100 para barras de progresso. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export { decimalFormatter }
