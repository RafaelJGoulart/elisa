const integerFormatter = new Intl.NumberFormat('pt-BR')

export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return integerFormatter.format(value)
}

export function formatXpAmount(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatInteger(value)} EXP`
}
