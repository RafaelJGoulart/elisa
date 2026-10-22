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
import { clampPercent, formatAmount, formatDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { activitiesService, getErrorMessage } from '@/services/activities'
import type { ActivityProgressEntry } from '@/features/activities/types'
import { ActivityFormDialog } from '../components/ActivityFormDialog'
import { ActivityStats } from '../components/ActivityStats'
import { ContributionCalendar } from '../components/ContributionCalendar'
import { DeleteActivityDialog } from '../components/DeleteActivityDialog'
import { DeleteProgressEntryDialog } from '../components/DeleteProgressEntryDialog'
import { ProgressEntryDialog } from '../components/ProgressEntryDialog'

const PERIODS = [
  { weeks: 13, label: '3 meses' },
  { weeks: 26, label: '6 meses' },
  { weeks: 52, label: '12 meses' },
] as const

const FREQUENCY_PERIOD_LABELS = {
  daily: 'por dia',
  weekly: 'por semana',
  monthly: 'por mês',
} as const

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
  const [progressOpen, setProgressOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ActivityProgressEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<ActivityProgressEntry | null>(null)

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
    () => (data ? data.completedDates : []),
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

  function handleProgressSaved() {
    reload()
    toast({
      title: editingEntry ? 'Registro atualizado' : 'Quantidade registrada',
      description: 'As estatísticas do hábito já foram recalculadas.',
      variant: 'success',
    })
  }

  async function handleDeleteEntry() {
    if (!deletingEntry) return
    await activitiesService.removeProgress(activityId, deletingEntry.id)
    setDeletingEntry(null)
    reload()
    toast({
      title: 'Registro excluído',
      description: 'A quantidade foi removida do histórico.',
      variant: 'success',
    })
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

  const { activity, stats } = data
  const color = getActivityColor(activity.color)
  const today = todayKey()
  const measurable = activity.kind === 'measurable'
  const symbol = activity.unit?.symbol ?? null
  const selectedIsFuture = selectedDate > today
  const selectedIsDone = completedDates.includes(selectedDate)
  const selectedLog = data.logs.find((log) => log.date === selectedDate)
  const pending = pendingDate === selectedDate

  const selectedDay = measurable
    ? stats.daily?.find((item) => item.date === selectedDate)
    : undefined
  const selectedEntries = measurable
    ? [...data.progressEntries]
        .filter((entry) => entry.date === selectedDate)
        .sort((a, b) => b.id - a.id)
    : []

  const gridDescription = measurable
    ? activity.frequency === 'daily'
      ? 'A grade destaca os dias em que a meta foi atingida. As estatísticas acima consideram todo o histórico.'
      : 'A grade destaca os dias com registros. O cumprimento da meta é avaliado por período nas estatísticas.'
    : 'As estatísticas acima consideram todo o histórico. A grade mostra o período selecionado.'

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
              {activity.category}
            </p>
            {measurable ? (
              <Badge variant="outline">
                <Icon name="bar-chart-2" size={11} />
                {activity.unit?.name ?? 'mensurável'} ·{' '}
                {FREQUENCY_PERIOD_LABELS[activity.frequency]}
              </Badge>
            ) : (
              <Badge variant="outline">
                <Icon name="check" size={11} />
                conclusão diária
              </Badge>
            )}
            {activity.archived ? <Badge variant="outline">arquivada</Badge> : null}
          </div>
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

      <ActivityStats activity={activity} stats={stats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Período da grade</h2>
          <p className="mt-1 text-xs text-text-secondary">{gridDescription}</p>
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ContributionCalendar
          completedDates={completedDates}
          range={data.range}
          colorHex={color.hex}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          today={today}
        />

        <aside className="self-start rounded-xl border border-border bg-surface p-5 xl:sticky xl:top-6">
          {measurable ? (
            <>
              <div className="mb-5 rounded-lg border border-border bg-background p-3.5">
                <p className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
                  Período atual
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {formatLongDateBR(stats.currentPeriodStart ?? today)} a{' '}
                  {formatLongDateBR(stats.currentPeriodEnd ?? today)}
                </p>
                <p className="mt-3 font-mono text-base font-medium text-foreground">
                  {formatAmount(stats.currentPeriodAmount ?? 0, symbol)}
                  {activity.targetAmount != null ? (
                    <span className="text-sm text-text-secondary">
                      {' '}
                      / {formatAmount(activity.targetAmount, symbol)}
                    </span>
                  ) : null}
                </p>
                {activity.targetAmount != null ? (
                  <>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(
                        clampPercent(stats.currentPeriodPercent ?? 0),
                      )}
                      aria-label="Progresso do período atual"
                    >
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${clampPercent(stats.currentPeriodPercent ?? 0)}%`,
                          backgroundColor: color.hex,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-text-secondary">
                      {stats.currentPeriodMet
                        ? 'Meta do período atingida.'
                        : `${formatDecimal(stats.currentPeriodPercent ?? 0, 1)}% da meta.`}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-text-secondary">
                    Sem meta definida. O período registra apenas a quantidade realizada.
                  </p>
                )}
              </div>

              <p className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
                Dia selecionado
              </p>
              <h2 className="mt-2 text-sm font-semibold text-foreground first-letter:uppercase">
                {formatLongDateBR(selectedDate)}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selectedIsFuture ? (
                  <Badge variant="outline">
                    <Icon name="clock" size={11} />
                    Dia futuro
                  </Badge>
                ) : selectedEntries.length > 0 ? (
                  <Badge variant="secondary">
                    {selectedEntries.length}{' '}
                    {selectedEntries.length === 1 ? 'registro' : 'registros'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Sem registro</Badge>
                )}
                {activity.frequency === 'daily' && selectedDay?.goalMet ? (
                  <Badge variant="success">
                    <Icon name="check" size={11} />
                    Meta atingida
                  </Badge>
                ) : null}
              </div>

              {selectedDay ? (
                <p className="mt-3 font-mono text-sm text-foreground">
                  {formatAmount(selectedDay.amount, symbol)}{' '}
                  <span className="font-sans text-[11px] text-text-secondary">
                    no dia · {selectedDay.entries}{' '}
                    {selectedDay.entries === 1 ? 'registro' : 'registros'}
                  </span>
                </p>
              ) : null}

              <div className="mt-4 space-y-2">
                {selectedIsFuture ? (
                  <p className="rounded-md border border-border bg-background px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
                    Este dia ainda não chegou. Registros só podem ser feitos até hoje.
                  </p>
                ) : (
                  <Button className="w-full" onClick={() => setProgressOpen(true)}>
                    <Icon name="plus" size={14} />
                    Registrar quantidade
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

              {selectedEntries.length > 0 ? (
                <ul className="mt-5 space-y-2 border-t border-border pt-4">
                  {selectedEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-border bg-background px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-foreground">
                            {formatAmount(entry.amount, entry.unit.symbol)}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 break-words text-xs leading-relaxed text-text-secondary">
                              {entry.note}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[10px] text-text-secondary">
                            {formatDateTimeBR(entry.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            aria-label={`Editar registro de ${formatAmount(
                              entry.amount,
                              entry.unit.symbol,
                            )}`}
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Icon name="edit-2" size={13} />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-red/10 hover:text-red focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            aria-label={`Excluir registro de ${formatAmount(
                              entry.amount,
                              entry.unit.symbol,
                            )}`}
                            onClick={() => setDeletingEntry(entry)}
                          >
                            <Icon name="trash-2" size={13} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}
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

      {measurable ? (
        <>
          <ProgressEntryDialog
            open={progressOpen || editingEntry !== null}
            onOpenChange={(open) => {
              if (!open) {
                setProgressOpen(false)
                setEditingEntry(null)
              }
            }}
            activity={activity}
            entry={editingEntry}
            defaultDate={selectedDate}
            onSaved={handleProgressSaved}
          />

          <DeleteProgressEntryDialog
            open={deletingEntry !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingEntry(null)
            }}
            description={
              deletingEntry
                ? `O registro de ${formatAmount(
                    deletingEntry.amount,
                    deletingEntry.unit.symbol,
                  )} em ${formatLongDateBR(deletingEntry.date)} será removido.`
                : ''
            }
            onConfirm={handleDeleteEntry}
          />
        </>
      ) : null}
    </div>
  )
}
