import { Icon } from '@/components/shared/Icon'
import { formatDateBR } from '@/lib/dates'
import type { ActivityStats as ActivityStatsData } from '@/features/activities/types'

interface ActivityStatsProps {
  stats: ActivityStatsData
}

export function ActivityStats({ stats }: ActivityStatsProps) {
  const items = [
    {
      icon: 'check-circle',
      label: 'Dias concluídos',
      value: String(stats.totalCompleted),
    },
    {
      icon: 'trending-up',
      label: 'Sequência atual',
      value: `${stats.currentStreak} ${stats.currentStreak === 1 ? 'dia' : 'dias'}`,
    },
    {
      icon: 'award',
      label: 'Maior sequência',
      value: `${stats.longestStreak} ${stats.longestStreak === 1 ? 'dia' : 'dias'}`,
    },
    {
      icon: 'clock',
      label: 'Último registro',
      value: stats.lastCompletedAt ? formatDateBR(stats.lastCompletedAt) : '—',
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-surface px-4 py-3.5"
        >
          <dt className="flex items-center gap-2 text-[11px] text-text-secondary">
            <Icon name={item.icon} size={13} className="text-text-disabled" />
            {item.label}
          </dt>
          <dd className="mt-1.5 font-mono text-base font-medium tracking-tight text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
