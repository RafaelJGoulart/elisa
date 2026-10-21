import { useMemo } from 'react'

import { buildContributionCalendar, getCalendarRange, todayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface MiniContributionGridProps {
  dates: string[]
  colorHex: string
  weeks?: number
}

const FUTURE_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(135deg, #1C1C21 0px, #1C1C21 1px, transparent 1px, transparent 3px)',
}

export function MiniContributionGrid({
  dates,
  colorHex,
  weeks: weekCount = 12,
}: MiniContributionGridProps) {
  const calendar = useMemo(() => {
    const range = getCalendarRange(weekCount)
    return buildContributionCalendar(range.start, range.end)
  }, [weekCount])

  const completed = useMemo(() => new Set(dates), [dates])
  const today = todayKey()

  return (
    <div
      className="flex gap-[2px]"
      aria-hidden="true"
      title="Prévia das últimas semanas"
    >
      {calendar.weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-[2px]">
          {week.days.map((day, dayIndex) => {
            if (!day) {
              return <span key={dayIndex} className="size-2 rounded-[2px]" />
            }
            const isDone = completed.has(day.date)
            return (
              <span
                key={dayIndex}
                className={cn(
                  'size-2 rounded-[2px]',
                  isDone
                    ? 'opacity-90'
                    : day.isFuture
                      ? 'border border-border/50'
                      : 'bg-surface-raised',
                  day.date === today && !isDone && 'ring-1 ring-border',
                )}
                style={{
                  backgroundColor: isDone ? colorHex : undefined,
                  ...(day.isFuture && !isDone ? FUTURE_STYLE : {}),
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
