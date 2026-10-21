import { describe, expect, it } from 'vitest'

import {
  buildContributionCalendar,
  formatDateBR,
  getCalendarRange,
  isValidDateKey,
  toDateKey,
} from '@/lib/dates'

describe('dates', () => {
  it('formata e valida datas no padrão brasileiro', () => {
    expect(formatDateBR('2026-10-21')).toBe('21/10/2026')
    expect(isValidDateKey('2026-10-21')).toBe(true)
    expect(isValidDateKey('2026-02-30')).toBe(false)
    expect(isValidDateKey('21/10/2026')).toBe(false)
  })

  it('mantém a data local ao gerar a chave', () => {
    expect(toDateKey(new Date(2026, 9, 21, 23, 30))).toBe('2026-10-21')
  })

  it('gera um calendário alinhado por semanas com dias futuros', () => {
    const today = new Date(2026, 9, 21, 12)
    const range = getCalendarRange(2, today)
    const calendar = buildContributionCalendar(range.start, range.end, today)

    expect(calendar.start).toBe('2026-10-04')
    expect(calendar.end).toBe('2026-10-24')
    expect(calendar.weeks).toHaveLength(3)

    const days = calendar.weeks.flatMap((week) => week.days).filter((day) => day !== null)
    expect(days).toHaveLength(21)
    expect(days.filter((day) => day.isFuture).map((day) => day.date)).toEqual([
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ])
    expect(calendar.months[0]).toEqual({ label: 'out', weekIndex: 0 })
  })

  it('não inclui dias fora do intervalo', () => {
    const calendar = buildContributionCalendar('2026-10-04', '2026-10-10')
    const days = calendar.weeks.flatMap((week) => week.days)
    expect(days).toHaveLength(7)
    expect(days.every((day) => day !== null)).toBe(true)
  })
})
