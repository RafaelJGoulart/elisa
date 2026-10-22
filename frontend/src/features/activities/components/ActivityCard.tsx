import { Link } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getActivityColor } from '@/lib/colors'
import type { Activity, ActivityWithStats } from '@/features/activities/types'
import { MiniContributionGrid } from './MiniContributionGrid'

interface ActivityCardProps {
  activity: ActivityWithStats
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}

export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const color = getActivityColor(activity.color)

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text-disabled/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              <Link
                to={`/atividades/${activity.id}`}
                className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {activity.name}
              </Link>
            </h2>
          </div>
          <p className="mt-1.5 text-[11px] font-medium tracking-[0.1em] text-text-secondary uppercase">
            {activity.category}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="-mt-1 -mr-1 rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Opções de ${activity.name}`}
            >
              <Icon name="more-horizontal" size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/atividades/${activity.id}`} className="flex items-center gap-2">
                <Icon name="calendar" size={14} />
                Abrir histórico
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(activity)}>
              <Icon name="edit-2" size={14} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(activity)}>
              <Icon name="trash-2" size={14} />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activity.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {activity.description}
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-secondary italic">Sem descrição.</p>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
        <dl className="flex items-center gap-5">
          <div>
            <dt className="text-[10px] tracking-[0.08em] text-text-secondary uppercase">Total</dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground">
              {activity.stats.totalCompleted}{' '}
              <span className="text-xs text-text-secondary">
                {activity.stats.totalCompleted === 1 ? 'dia' : 'dias'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-[0.08em] text-text-secondary uppercase">
              Sequência
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground">
              {activity.stats.currentStreak}{' '}
              <span className="text-xs text-text-secondary">
                {activity.stats.currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </dd>
          </div>
          {activity.stats.currentStreak > 0 ? (
            <Badge variant="success" className="mb-0.5">
              <Icon name="trending-up" size={11} />
              ativa
            </Badge>
          ) : null}
        </dl>

        <div className="flex items-center gap-2">
          <MiniContributionGrid dates={activity.recentLogs} colorHex={color.hex} />
          <span className="sr-only">
            {activity.recentLogs.length}{' '}
            {activity.recentLogs.length === 1
              ? 'dia concluído'
              : 'dias concluídos'}{' '}
            nas últimas semanas.
          </span>
        </div>
      </div>
    </article>
  )
}
