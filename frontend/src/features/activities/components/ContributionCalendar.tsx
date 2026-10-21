import { useMemo } from 'react'

import {
  buildContributionCalendar,
  formatLongDateBR,
  todayKey,
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

const CELL_SIZE = 12
const CELL_GAP = 3
const WEEK_STEP = CELL_SIZE + CELL_GAP

const FUTURE_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(135deg, #1C1C21 0px, #1C1C21 1.5px, transparent 1.5px, transparent 4px)',
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
            Clique em um dia para ver os detalhes. Dias futuros aparecem hachurados.
          </p>
        </div>
        <p className="font-mono text-xs text-text-secondary">
          {completedDates.length} {completedDates.length === 1 ? 'registro' : 'registros'} no período
        </p>
      </div>

      <div
        className="overflow-x-auto pb-2"
        tabIndex={0}
        role="region"
        aria-label="Calendário de contribuições, use as setas para rolar horizontalmente"
      >
        <div className="inline-flex min-w-full gap-2">
          <div
            className="flex w-8 shrink-0 flex-col pt-[19px]"
            style={{ gap: `${CELL_GAP}px` }}
            aria-hidden="true"
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={label}
                className="text-[10px] leading-3 text-text-disabled"
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

            <div className="flex" style={{ gap: `${CELL_GAP}px` }}>
              {calendar.weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col"
                  style={{ gap: `${CELL_GAP}px` }}
                >
                  {week.days.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <span
                          key={dayIndex}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                          aria-hidden="true"
                        />
                      )
                    }

                    const isDone = completed.has(day.date)
                    const isSelected = selectedDate === day.date
                    const status = day.isFuture
                      ? 'dia futuro'
                      : isDone
                        ? 'concluído'
                        : 'sem registro'

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => onSelectDate(day.date)}
                        aria-label={`${formatLongDateBR(day.date)} — ${status}`}
                        aria-pressed={isSelected}
                        title={`${formatLongDateBR(day.date)} — ${status}`}
                        className={cn(
                          'rounded-[3px] transition-[transform,box-shadow,border-color] duration-100',
                          !isDone && !day.isFuture && 'border border-border/70 bg-surface-raised',
                          day.isFuture && 'border border-border/60',
                          day.date === today && !isDone && !day.isFuture && 'border-text-disabled',
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
            className="size-3 rounded-[3px]"
            style={{ backgroundColor: colorHex }}
            aria-hidden="true"
          />
          Concluído
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-3 rounded-[3px] border border-border/70 bg-surface-raised"
            aria-hidden="true"
          />
          Sem registro
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-3 rounded-[3px] border border-border/60"
            style={FUTURE_STYLE}
            aria-hidden="true"
          />
          Futuro
        </span>
      </div>
    </section>
  )
}
