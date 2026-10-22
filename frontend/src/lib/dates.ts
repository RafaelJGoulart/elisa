import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isValid,
  parse,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromDateKey(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date())
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false
  return isValid(fromDateKey(value))
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function formatDateBR(key: string): string {
  return format(fromDateKey(key), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatLongDateBR(key: string): string {
  return format(fromDateKey(key), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatShortDateBR(key: string): string {
  return format(fromDateKey(key), "d 'de' MMM", { locale: ptBR })
}

export function formatMonthYearBR(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR })
}

export function formatDateTimeBR(isoValue: string): string {
  return format(parseISO(isoValue), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function isFutureDateKey(key: string, today = todayKey()): boolean {
  return key > today
}

/** Move uma data local em N dias, preservando o formato `YYYY-MM-DD`. */
export function shiftDateKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days))
}

/** Primeiro e último dia da semana (domingo e sábado) de uma data local. */
export function weekBoundsKeys(key: string): { first: string; last: string } {
  const date = fromDateKey(key)
  return {
    first: toDateKey(startOfWeek(date, { weekStartsOn: 0 })),
    last: toDateKey(endOfWeek(date, { weekStartsOn: 0 })),
  }
}

export interface ContributionDay {
  date: string
  isFuture: boolean
}

export interface ContributionWeek {
  days: Array<ContributionDay | null>
}

export interface ContributionMonth {
  label: string
  weekIndex: number
}

export interface ContributionCalendar {
  weeks: ContributionWeek[]
  months: ContributionMonth[]
  start: string
  end: string
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export function getCalendarRange(
  weeks: number,
  today = new Date(),
): { start: string; end: string } {
  const start = startOfWeek(subWeeks(today, weeks), { weekStartsOn: 0 })
  const end = endOfWeek(today, { weekStartsOn: 0 })
  return { start: toDateKey(start), end: toDateKey(end) }
}

export function getDefaultCalendarRange(today = new Date()): { start: string; end: string } {
  return getCalendarRange(52, today)
}

export function buildContributionCalendar(
  rangeStart: string,
  rangeEnd: string,
  today = new Date(),
): ContributionCalendar {
  const startDate = startOfWeek(fromDateKey(rangeStart), { weekStartsOn: 0 })
  const endDate = endOfWeek(fromDateKey(rangeEnd), { weekStartsOn: 0 })
  const todayDateKey = toDateKey(today)
  const totalWeeks = Math.floor(differenceInCalendarDays(endDate, startDate) / 7) + 1

  const weeks: ContributionWeek[] = []
  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const days: Array<ContributionDay | null> = []
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(startDate, weekIndex * 7 + dayIndex)
      const key = toDateKey(date)
      if (key < rangeStart || key > rangeEnd) {
        days.push(null)
        continue
      }
      days.push({ date: key, isFuture: key > todayDateKey })
    }
    weeks.push({ days })
  }

  const months: ContributionMonth[] = []
  let lastMonth = ''
  weeks.forEach((week, weekIndex) => {
    const firstDay = week.days.find((day): day is ContributionDay => day !== null)
    if (!firstDay) return
    const month = format(fromDateKey(firstDay.date), 'MMM', { locale: ptBR }).replace('.', '')
    if (month !== lastMonth) {
      months.push({ label: month, weekIndex })
      lastMonth = month
    }
  })

  return {
    weeks,
    months,
    start: rangeStart,
    end: rangeEnd,
  }
}
