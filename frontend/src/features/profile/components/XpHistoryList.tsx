import { Icon } from '@/components/shared/Icon'
import { formatDateBR } from '@/lib/dates'
import { formatXpAmount } from '@/features/profile/format'
import type { XpEvent } from '@/features/profile/types'

function eventIcon(event: XpEvent): string {
  if (event.amount < 0) return 'rotate-ccw'
  if (event.kind === 'weekly_bonus') return 'star'
  return 'check-circle'
}

export function XpHistoryList({ events }: { events: XpEvent[] }) {
  return (
    <section
      aria-labelledby="profile-history-title"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="profile-history-title" className="text-sm font-semibold text-foreground">
            Histórico recente
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Cada linha é um evento do extrato de EXP. Correções aparecem como estornos.
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
          <Icon name="list" size={15} />
        </span>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-text-secondary">
          Nenhum evento de EXP registrado ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 py-3.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
                <Icon name={eventIcon(event)} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-foreground">{event.description}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {event.categoryLabel} · {formatDateBR(event.activityDate)}
                </p>
              </div>
              <span
                className={
                  event.amount < 0
                    ? 'shrink-0 font-mono text-sm text-red'
                    : 'shrink-0 font-mono text-sm text-green'
                }
              >
                {formatXpAmount(event.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
