import { Icon } from '@/components/shared/Icon'
import { formatDateBR } from '@/lib/dates'
import { formatAmount, formatDecimal } from '@/lib/format'
import type {
  Activity,
  ActivityStats as ActivityStatsData,
} from '@/features/activities/types'

interface ActivityStatsProps {
  activity: Activity
  stats: ActivityStatsData
}

const PERIOD_LABELS = {
  daily: 'Hoje',
  weekly: 'Nesta semana',
  monthly: 'Neste mês',
} as const

export function ActivityStats({ activity, stats }: ActivityStatsProps) {
  const measurable = activity.kind === 'measurable'
  const symbol = activity.unit?.symbol ?? null

  const items = measurable
    ? [
        {
          icon: 'bar-chart-2',
          label: 'Total acumulado',
          value: formatAmount(stats.totalAmount ?? 0, symbol),
        },
        {
          icon: 'target',
          label: PERIOD_LABELS[activity.frequency],
          value:
            activity.targetAmount != null
              ? `${formatAmount(stats.currentPeriodAmount ?? 0, symbol)} / ${formatAmount(
                  activity.targetAmount,
                  symbol,
                )}`
              : formatAmount(stats.currentPeriodAmount ?? 0, symbol),
        },
        {
          icon: 'check-circle',
          label: 'Períodos cumpridos',
          value: String(stats.totalCompleted),
        },
        {
          icon: 'activity',
          label: 'Registros',
          value: `${stats.entriesCount ?? 0} · ${stats.recordedDays ?? 0} ${
            (stats.recordedDays ?? 0) === 1 ? 'dia' : 'dias'
          }`,
        },
        {
          icon: 'trending-up',
          label: 'Sequência atual',
          value: `${stats.currentStreak} ${
            activity.frequency === 'daily'
              ? stats.currentStreak === 1
                ? 'dia'
                : 'dias'
              : activity.frequency === 'weekly'
                ? stats.currentStreak === 1
                  ? 'semana'
                  : 'semanas'
                : stats.currentStreak === 1
                  ? 'mês'
                  : 'meses'
          }`,
        },
        {
          icon: 'award',
          label: 'Média por dia registrado',
          value: formatAmount(stats.averagePerRecordedDay ?? 0, symbol),
        },
        {
          icon: 'clock',
          label: 'Último período cumprido',
          value: stats.lastCompletedAt ? formatDateBR(stats.lastCompletedAt) : '—',
        },
        {
          icon: 'percent',
          label: 'Progresso do período',
          value:
            stats.currentPeriodPercent != null
              ? `${formatDecimal(stats.currentPeriodPercent, 1)}%`
              : 'Sem meta',
        },
      ]
    : [
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
