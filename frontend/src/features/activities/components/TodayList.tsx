import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/components/shared/toast-context'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { getActivityColor } from '@/lib/colors'
import { getErrorMessage, activitiesService } from '@/services/activities'
import { MiniContributionGrid } from './MiniContributionGrid'

export function TodayList() {
  const loadToday = useCallback((signal: AbortSignal) => activitiesService.today(signal), [])
  const { data, loading, error, reload } = useAsyncResource(loadToday, [])
  const { toast } = useToast()
  const [pendingId, setPendingId] = useState<number | null>(null)

  async function handleToggle(activityId: number, date: string, completedToday: boolean) {
    setPendingId(activityId)
    try {
      await activitiesService.toggleLog(activityId, date, !completedToday)
      reload()
      toast({
        title: completedToday ? 'Registro removido' : 'Atividade concluída',
        description: completedToday
          ? 'O dia de hoje voltou a ficar sem registro.'
          : 'Seu histórico foi atualizado.',
        variant: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Não foi possível atualizar',
        description: getErrorMessage(caught),
        variant: 'error',
      })
    } finally {
      setPendingId(null)
    }
  }

  if (loading && !data) return <LoadingState rows={2} />
  if (error && !data) {
    return <ErrorState message={getErrorMessage(error)} onRetry={reload} />
  }
  if (!data) return null

  if (data.activities.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="Nenhuma atividade ainda"
        description="Crie sua primeira atividade para começar a registrar sua evolução. Tudo fica salvo apenas neste computador."
        action={
          <Button asChild size="sm">
            <Link to="/atividades">
              <Icon name="plus" size={14} />
              Criar atividade
            </Link>
          </Button>
        }
      />
    )
  }

  const completedCount = data.activities.filter((entry) => entry.completedToday).length
  const allDone = completedCount === data.activities.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          {completedCount} de {data.activities.length}{' '}
          {data.activities.length === 1 ? 'atividade' : 'atividades'} concluídas
        </p>
        {allDone ? (
          <span className="flex items-center gap-1.5 text-[11px] text-green">
            <Icon name="check-circle" size={13} />
            Tudo feito por hoje
          </span>
        ) : null}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.activities.map((entry) => {
          const color = getActivityColor(entry.activity.color)
          const pending = pendingId === entry.activity.id

          return (
            <li
              key={entry.activity.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <Link
                    to={`/atividades/${entry.activity.id}`}
                    className="truncate text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {entry.activity.name}
                  </Link>
                </div>
                {entry.currentStreak > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-secondary">
                    <Icon name="trending-up" size={11} />
                    {entry.currentStreak}{' '}
                    {entry.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
                  </span>
                ) : null}
              </div>

              <p className="truncate text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                {entry.activity.category}
              </p>

              <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                <div className="shrink-0">
                  <MiniContributionGrid
                    dates={entry.recentLogs}
                    colorHex={color.hex}
                    weeks={12}
                  />
                  <span className="sr-only">
                    {entry.totalCompleted}{' '}
                    {entry.totalCompleted === 1 ? 'dia registrado' : 'dias registrados'} no
                    total.
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={entry.completedToday ? 'outline' : 'secondary'}
                  disabled={pending}
                  onClick={() =>
                    void handleToggle(entry.activity.id, data.date, entry.completedToday)
                  }
                  aria-pressed={entry.completedToday}
                  title={
                    entry.completedToday
                      ? 'Clique para desfazer o registro de hoje'
                      : 'Registrar conclusão de hoje'
                  }
                  className="shrink-0"
                >
                  {pending ? (
                    <Icon name="loader" size={13} className="animate-spin" />
                  ) : entry.completedToday ? (
                    <Icon name="check-circle" size={13} style={{ color: color.hex }} />
                  ) : (
                    <Icon name="plus" size={13} />
                  )}
                  {entry.completedToday ? 'Feito hoje' : 'Registrar hoje'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
