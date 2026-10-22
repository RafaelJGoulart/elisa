import { useMemo, useState, type KeyboardEvent } from 'react'

import {
  buildContributionCalendar,
  formatLongDateBR,
  shiftDateKey,
  todayKey,
  weekBoundsKeys,
  WEEKDAY_LABELS,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

interface ContributionCalendarProps {
  completedDates: string[]
  range: { start: string; end: string }
  colorHex: string
  selectedDate: string
  onSelectDate: (date: string) => void
  today?: string
}

/**
 * A célula tem 24 px para atender ao alvo mínimo de toque (WCAG 2.5.8) e
 * continua sendo pequena o bastante para caber doze meses de histórico.
 */
const CELL_SIZE = 24
const CELL_GAP = 3
const WEEK_STEP = CELL_SIZE + CELL_GAP

const FUTURE_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(135deg, #1C1C21 0px, #1C1C21 2px, transparent 2px, transparent 6px)',
}

function cellId(date: string): string {
  return `contribution-cell-${date}`
}

export function ContributionCalendar({
  completedDates,
  range,
  colorHex,
  selectedDate,
  onSelectDate,
  today = todayKey(),
}: ContributionCalendarProps) {
  const calendar = useMemo(
    () => buildContributionCalendar(range.start, range.end, new Date(`${today}T12:00:00`)),
    [range.start, range.end, today],
  )

  const completed = useMemo(() => new Set(completedDates), [completedDates])

  // Roving tabindex: apenas a célula ativa é alcançável pelo Tab; as setas do
  // teclado movem o foco dentro da grade.
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [lastSelectedDate, setLastSelectedDate] = useState(selectedDate)

  // Quando a seleção muda por fora da grade, o ponto ativo volta a segui-la.
  if (selectedDate !== lastSelectedDate) {
    setLastSelectedDate(selectedDate)
    setActiveDate(null)
  }

  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    for (const week of calendar.weeks) {
      for (const day of week.days) {
        if (day) dates.add(day.date)
      }
    }
    return dates
  }, [calendar])

  const firstDate = useMemo(() => {
    for (const week of calendar.weeks) {
      for (const day of week.days) {
        if (day) return day.date
      }
    }
    return range.start
  }, [calendar, range.start])

  const active = useMemo(() => {
    if (activeDate && availableDates.has(activeDate)) return activeDate
    if (availableDates.has(selectedDate)) return selectedDate
    return firstDate
  }, [activeDate, availableDates, selectedDate, firstDate])

  function focusCell(date: string) {
    const cell = document.getElementById(cellId(date))
    if (cell instanceof HTMLElement) cell.focus()
  }

  function handleSelect(date: string) {
    setActiveDate(date)
    onSelectDate(date)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let target: string | null = null

    switch (event.key) {
      case 'ArrowLeft':
        target = shiftDateKey(active, -1)
        break
      case 'ArrowRight':
        target = shiftDateKey(active, 1)
        break
      case 'ArrowUp':
        target = shiftDateKey(active, -7)
        break
      case 'ArrowDown':
        target = shiftDateKey(active, 7)
        break
      case 'Home':
        target = weekBoundsKeys(active).first
        break
      case 'End':
        target = weekBoundsKeys(active).last
        break
      default:
        return
    }

    event.preventDefault()
    if (!target || !availableDates.has(target)) return
    setActiveDate(target)
    focusCell(target)
  }

  return (
    <section
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      aria-labelledby="contribution-title"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="contribution-title" className="text-sm font-semibold text-foreground">
            Histórico de conclusões
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Clique em um dia para ver os detalhes ou use as setas do teclado para navegar
            pela grade. Dias futuros aparecem hachurados.
          </p>
        </div>
        <p className="font-mono text-xs text-text-secondary">
          {completedDates.length} {completedDates.length === 1 ? 'registro' : 'registros'} no período
        </p>
      </div>

      <div
        className="overflow-x-auto pb-2"
        role="region"
        aria-label="Calendário de contribuições"
      >
        <div className="inline-flex min-w-full gap-2">
          <div
            className="flex w-8 shrink-0 flex-col pt-[18px]"
            style={{ gap: `${CELL_GAP}px` }}
            aria-hidden="true"
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={label}
                className="text-[10px] leading-6 text-text-disabled"
                style={{ height: CELL_SIZE }}
              >
                {index === 1 || index === 3 || index === 5 ? label : ''}
              </div>
            ))}
          </div>

          <div>
            <div
              className="relative mb-1 h-3.5"
              style={{ width: calendar.weeks.length * WEEK_STEP }}
              aria-hidden="true"
            >
              {calendar.months.map((month) => (
                <span
                  key={`${month.label}-${month.weekIndex}`}
                  className="absolute top-0 text-[10px] text-text-disabled"
                  style={{ left: month.weekIndex * WEEK_STEP }}
                >
                  {month.label}
                </span>
              ))}
            </div>

            <div
              role="grid"
              aria-label="Dias do calendário de conclusões"
              onKeyDown={handleKeyDown}
              className="flex"
              style={{ gap: `${CELL_GAP}px` }}
            >
              {calendar.weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  role="row"
                  className="flex flex-col"
                  style={{ gap: `${CELL_GAP}px` }}
                >
                  {week.days.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={dayIndex}
                          role="gridcell"
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        />
                      )
                    }

                    const isDone = completed.has(day.date)
                    const isSelected = selectedDate === day.date
                    const isToday = day.date === today
                    const isActive = active === day.date
                    const status = [
                      day.isFuture ? 'dia futuro' : isDone ? 'concluído' : 'sem registro',
                      ...(isToday ? ['hoje'] : []),
                    ].join(' — ')

                    return (
                      <div
                        key={dayIndex}
                        role="gridcell"
                        aria-selected={isSelected}
                        className="flex shrink-0"
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      >
                        <button
                          id={cellId(day.date)}
                          type="button"
                          tabIndex={isActive ? 0 : -1}
                          onClick={() => handleSelect(day.date)}
                          aria-label={`${formatLongDateBR(day.date)} — ${status}`}
                          aria-pressed={isSelected}
                          title={`${formatLongDateBR(day.date)} — ${status}`}
                          className={cn(
                            'rounded-md transition-[transform,box-shadow,border-color] duration-100',
                            !isDone && !day.isFuture && 'border border-border/70 bg-surface-raised',
                            day.isFuture && 'border border-border/60',
                            isToday && 'border border-text-secondary',
                            'hover:border-text-secondary',
                            isSelected &&
                              'ring-2 ring-foreground ring-offset-1 ring-offset-surface',
                          )}
                          style={{
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                            backgroundColor: isDone ? colorHex : undefined,
                            ...(day.isFuture && !isDone ? FUTURE_STYLE : {}),
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-2">
          <span
            className="size-6 rounded-md"
            style={{ backgroundColor: colorHex }}
            aria-hidden="true"
          />
          Concluído
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-6 rounded-md border border-border/70 bg-surface-raised"
            aria-hidden="true"
          />
          Sem registro
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-6 rounded-md border border-border/60"
            style={FUTURE_STYLE}
            aria-hidden="true"
          />
          Futuro
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-6 rounded-md border border-text-secondary"
            aria-hidden="true"
          />
          Hoje
        </span>
      </div>
    </section>
  )
}
