import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/components/shared/toast-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { getActivityColor } from '@/lib/colors'
import {
  formatDateTimeBR,
  formatLongDateBR,
  getCalendarRange,
  todayKey,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { activitiesService, getErrorMessage } from '@/services/activities'
import { ActivityFormDialog } from '../components/ActivityFormDialog'
import { ActivityStats } from '../components/ActivityStats'
import { ContributionCalendar } from '../components/ContributionCalendar'
import { DeleteActivityDialog } from '../components/DeleteActivityDialog'

const PERIODS = [
  { weeks: 13, label: '3 meses' },
  { weeks: 26, label: '6 meses' },
  { weeks: 52, label: '12 meses' },
] as const

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const activityId = Number(id)
  const isValidId = Number.isInteger(activityId) && activityId > 0

  const [weeks, setWeeks] = useState<number>(52)
  const range = useMemo(() => getCalendarRange(weeks), [weeks])
  const [selectedDate, setSelectedDate] = useState<string>(todayKey())
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  const loadHistory = useCallback(
    (signal: AbortSignal) => {
      if (!isValidId) {
        return Promise.reject(new Error('Atividade não encontrada.'))
      }
      return activitiesService.history(activityId, range, signal)
    },
    [activityId, isValidId, range],
  )

  const { data, loading, error, reload } = useAsyncResource(loadHistory, [
    activityId,
    range.start,
    range.end,
  ])

  function changePeriod(nextWeeks: number) {
    const nextRange = getCalendarRange(nextWeeks)
    setWeeks(nextWeeks)
    if (selectedDate < nextRange.start || selectedDate > nextRange.end) {
      setSelectedDate(todayKey())
    }
  }

  const completedDates = useMemo(
    () => (data ? data.logs.map((log) => log.date) : []),
    [data],
  )

  async function handleToggle(date: string, completed: boolean) {
    setPendingDate(date)
    try {
      await activitiesService.toggleLog(activityId, date, completed)
      reload()
      toast({
        title: completed ? 'Conclusão registrada' : 'Registro removido',
        description: completed
          ? `O dia ${formatLongDateBR(date)} foi marcado como concluído.`
          : `O dia ${formatLongDateBR(date)} voltou a ficar sem registro.`,
        variant: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Não foi possível atualizar o registro',
        description: getErrorMessage(caught),
        variant: 'error',
      })
    } finally {
      setPendingDate(null)
    }
  }

  async function handleDelete() {
    await activitiesService.remove(activityId)
    toast({
      title: 'Atividade excluída',
      description: 'A atividade e os registros associados foram removidos.',
      variant: 'success',
    })
    navigate('/atividades')
  }

  if (!isValidId) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Atividade não encontrada"
        description="O identificador informado não corresponde a uma atividade existente."
        headingLevel="h1"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/atividades">Voltar para atividades</Link>
          </Button>
        }
      />
    )
  }

  if (loading && !data) return <LoadingState rows={4} />

  if (error && !data) {
    return (
      <div className="space-y-5">
        <Link
          to="/atividades"
          className="inline-flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" size={14} />
          Atividades
        </Link>
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={reload}
          headingLevel="h1"
        />
      </div>
    )
  }

  if (!data) return null

  const { activity, stats, logs } = data
  const color = getActivityColor(activity.color)
  const today = todayKey()
  const selectedIsFuture = selectedDate > today
  const selectedIsDone = completedDates.includes(selectedDate)
  const selectedLog = logs.find((log) => log.date === selectedDate)
  const pending = pendingDate === selectedDate

  return (
    <div className="space-y-7">
      <div>
        <Link
          to="/atividades"
          className="inline-flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" size={14} />
          Atividades
        </Link>
      </div>

      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {activity.name}
            </h1>
          </div>
          <p className="mt-2 text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
            {activity.category}
          </p>
          {activity.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
              {activity.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Icon name="edit-2" size={14} />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red/30 text-red hover:border-red/50 hover:bg-red/10 hover:text-red"
            onClick={() => setDeleting(true)}
          >
            <Icon name="trash-2" size={14} />
            Excluir
          </Button>
        </div>
      </header>

      <ActivityStats stats={stats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Período da grade</h2>
          <p className="mt-1 text-xs text-text-secondary">
            As estatísticas acima consideram todo o histórico. A grade mostra o período
            selecionado.
          </p>
        </div>
        <div
          className="flex items-center gap-1 self-start rounded-lg border border-border bg-surface p-1"
          role="group"
          aria-label="Período do histórico"
        >
          {PERIODS.map((period) => (
            <button
              key={period.weeks}
              type="button"
              onClick={() => changePeriod(period.weeks)}
              aria-pressed={weeks === period.weeks}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                weeks === period.weeks
                  ? 'bg-surface-raised font-medium text-foreground'
                  : 'text-text-secondary hover:text-foreground',
              )}
            >
              {period.label}
            </button>
          ))}
          {loading ? (
            <Icon
              name="loader"
              size={13}
              className="mx-1 animate-spin text-text-disabled"
              label="Atualizando"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ContributionCalendar
          completedDates={completedDates}
          range={data.range}
          colorHex={color.hex}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          today={today}
        />

        <aside className="self-start rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6">
          <p className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
            Dia selecionado
          </p>
          <h2 className="mt-2 text-sm font-semibold text-foreground first-letter:uppercase">
            {formatLongDateBR(selectedDate)}
          </h2>

          <div className="mt-3">
            {selectedIsFuture ? (
              <Badge variant="outline">
                <Icon name="clock" size={11} />
                Dia futuro
              </Badge>
            ) : selectedIsDone ? (
              <Badge variant="success">
                <Icon name="check" size={11} />
                Concluído
              </Badge>
            ) : (
              <Badge variant="secondary">Sem registro</Badge>
            )}
          </div>

          {selectedLog ? (
            <p className="mt-4 text-xs leading-relaxed text-text-secondary">
              Registrado em {formatDateTimeBR(selectedLog.createdAt)}.
            </p>
          ) : null}

          <div className="mt-5 space-y-2">
            {selectedIsFuture ? (
              <p className="rounded-md border border-border bg-background px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
                Este dia ainda não chegou. Registros só podem ser feitos até hoje.
              </p>
            ) : (
              <Button
                className="w-full"
                variant={selectedIsDone ? 'outline' : 'default'}
                disabled={pending}
                onClick={() => void handleToggle(selectedDate, !selectedIsDone)}
              >
                {pending ? (
                  <Icon name="loader" size={14} className="animate-spin" />
                ) : selectedIsDone ? (
                  <Icon name="x" size={14} />
                ) : (
                  <Icon name="check" size={14} />
                )}
                {selectedIsDone ? 'Desfazer registro' : 'Registrar conclusão'}
              </Button>
            )}

            {selectedDate !== today ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-text-secondary"
                onClick={() => setSelectedDate(today)}
              >
                <Icon name="calendar" size={13} />
                Ir para hoje
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      <ActivityFormDialog
        open={editing}
        onOpenChange={setEditing}
        activity={activity}
        onSaved={() => {
          reload()
          toast({
            title: 'Atividade atualizada',
            description: 'As alterações já estão salvas.',
            variant: 'success',
          })
        }}
      />

      <DeleteActivityDialog
        open={deleting}
        onOpenChange={setDeleting}
        activityName={activity.name}
        onConfirm={handleDelete}
      />
    </div>
  )
}
