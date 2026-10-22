import { Icon } from '@/components/shared/Icon'
import { formatInteger } from '@/features/profile/format'
import type { ProfileStats } from '@/features/profile/types'

const ITEMS = [
  {
    key: 'habitOccurrences',
    icon: 'check-circle',
    label: 'Ocorrências de hábitos',
  },
  {
    key: 'habitWeeks',
    icon: 'calendar',
    label: 'Semanas concluídas',
  },
  {
    key: 'habitXp',
    icon: 'zap',
    label: 'EXP de hábitos',
  },
] as const

export function ProfileStatCards({ stats }: { stats: ProfileStats }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-border bg-surface px-4 py-4"
        >
          <dt className="flex items-center gap-2 text-[11px] text-text-secondary">
            <Icon name={item.icon} size={13} className="text-text-disabled" />
            {item.label}
          </dt>
          <dd className="mt-2 font-mono text-2xl font-medium tracking-tight text-foreground">
            {formatInteger(stats[item.key])}
          </dd>
        </div>
      ))}
    </dl>
  )
}
