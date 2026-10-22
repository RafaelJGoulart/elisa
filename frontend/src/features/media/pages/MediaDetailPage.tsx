import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { useToast } from '@/components/shared/toast-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { formatDateBR, formatDateTimeBR } from '@/lib/dates'
import { formatDecimal, formatMinutes } from '@/lib/format'
import { mediaUnitLabel } from '@/lib/media'
import type { MediaEvent } from '@/features/media/types'
import { mediaService } from '@/services/media'
import { MediaStatusBadge, MediaTypeBadge } from '../components/MediaBadges'
import { MediaConfirmDialog } from '../components/MediaConfirmDialog'
import { MediaEventDialog } from '../components/MediaEventDialog'
import { MediaItemDialog } from '../components/MediaItemDialog'
import { MediaProgressBar } from '../components/MediaProgressBar'

function TimeBadge({ event }: { event: MediaEvent }) {
  if (event.timeKind === 'real') {
    return (
      <Badge variant="success">
        <Icon name="clock" size={10} />
        {formatMinutes(event.knownMinutes ?? 0)} · real
      </Badge>
    )
  }
  if (event.timeKind === 'estimated') {
    return (
      <Badge variant="warning">
        <Icon name="clock" size={10} />~ {formatMinutes(event.estimatedMinutes ?? 0)} · estimado
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Icon name="help-circle" size={10} />
      tempo não informado
    </Badge>
  )
}

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const itemId = Number(id)
  const isValidId = Number.isInteger(itemId) && itemId > 0

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<MediaEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<MediaEvent | null>(null)

  const loadItem = useCallback(
    (signal: AbortSignal) => {
      if (!isValidId) return Promise.reject(new Error('Mídia não encontrada.'))
      return mediaService.get(itemId, signal)
    },
    [itemId, isValidId],
  )

  const { data, loading, error, reload } = useAsyncResource(loadItem, [itemId])

  function handleSaved() {
    reload()
    toast({
      title: 'Mídia atualizada',
      description: 'As estatísticas foram recalculadas.',
      variant: 'success',
    })
  }

  function handleEventSaved() {
    reload()
    toast({
      title: editingEvent ? 'Consumo atualizado' : 'Consumo registrado',
      description: 'O progresso e o tempo do item foram atualizados.',
      variant: 'success',
    })
  }

  async function handleDeleteEvent() {
    if (!deletingEvent) return
    await mediaService.removeEvent(deletingEvent.id)
    setDeletingEvent(null)
    reload()
    toast({
      title: 'Consumo excluído',
      description: 'O registro foi removido do histórico.',
      variant: 'success',
    })
  }

  async function handleDeleteItem() {
    await mediaService.remove(itemId)
    toast({
      title: 'Mídia excluída',
      description: 'O item e todos os consumos foram removidos.',
      variant: 'success',
    })
    navigate('/midia')
  }

  if (!isValidId) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Mídia não encontrada"
        description="O identificador informado não corresponde a um item do acervo."
        headingLevel="h1"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/midia">Voltar para mídia</Link>
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
          to="/midia"
          className="inline-flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" size={14} />
          Mídia
        </Link>
        <ErrorState
          message={error.message}
          onRetry={reload}
          headingLevel="h1"
        />
      </div>
    )
  }

  if (!data) return null

  const { progress, time } = data
  const events = [...data.events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.id - a.id
  })

  return (
    <div className="space-y-7">
      <div>
        <Link
          to="/midia"
          className="inline-flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" size={14} />
          Mídia
        </Link>
      </div>

      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <MediaTypeBadge type={data.type} />
            <MediaStatusBadge status={data.status} />
            {data.archived ? <Badge variant="outline">arquivado</Badge> : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {data.title}
          </h1>
          {data.alternateTitle ? (
            <p className="mt-1 text-sm text-text-secondary italic">{data.alternateTitle}</p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            {data.creator ? <span>{data.creator}</span> : null}
            {data.releaseYear ? <span className="font-mono">{data.releaseYear}</span> : null}
            {data.rating ? (
              <span className="flex items-center gap-1 text-yellow">
                <Icon name="star" size={12} />
                {data.rating}/5
              </span>
            ) : null}
          </p>
          {data.genres.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Gêneros">
              {data.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="outline">{genre}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setEventOpen(true)}>
            <Icon name="plus" size={14} />
            Registrar consumo
          </Button>
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

      {data.description ? (
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
          {data.description}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
                  Progresso
                </p>
                <p className="mt-2 font-mono text-2xl font-medium tracking-tight text-foreground">
                  {formatDecimal(progress.current)}
                  {progress.total != null ? (
                    <span className="text-base text-text-secondary">
                      {' '}
                      / {formatDecimal(progress.total)} {progress.label}
                    </span>
                  ) : (
                    <span className="text-base text-text-secondary"> {progress.label}</span>
                  )}
                </p>
              </div>
              {progress.percent != null ? (
                <span className="font-mono text-sm text-text-secondary">
                  {formatDecimal(progress.percent, 1)}%
                </span>
              ) : (
                <Badge variant="outline">Total não informado</Badge>
              )}
            </div>

            {progress.total != null ? (
              <MediaProgressBar
                className="mt-3 h-2"
                percent={progress.percent}
                label={`Progresso de ${data.title}`}
              />
            ) : null}

            {progress.override != null ? (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-text-secondary">
                <Icon name="edit-3" size={13} className="mt-0.5 shrink-0" />
                Progresso manual ativo: {formatDecimal(progress.override)} {progress.label}.
                O consumo registrado abaixo soma {formatDecimal(progress.consumed)}{' '}
                {progress.label}, mas não substitui o valor manual.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {data.consumed.length === 0 ? (
                <p className="text-xs text-text-secondary">
                  Nenhum consumo registrado ainda.
                </p>
              ) : (
                data.consumed.map((quantity) => (
                  <Badge key={quantity.unit} variant="secondary">
                    <Icon name="check" size={10} />
                    {formatDecimal(quantity.amount)} {quantity.label} consumidos
                  </Badge>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Tempo</h2>
              <Badge variant="outline">
                <Icon name="info" size={10} />
                estimativas são separadas do tempo real
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-[11px] text-text-secondary">Tempo real</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {time.realMinutes > 0 ? formatMinutes(time.realMinutes) : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-[11px] text-text-secondary">Tempo estimado</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {time.estimatedMinutes > 0
                    ? `~ ${formatMinutes(time.estimatedMinutes)}`
                    : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-[11px] text-text-secondary">Tempo conhecido</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {time.totalKnownMinutes > 0
                    ? formatMinutes(time.totalKnownMinutes)
                    : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-[11px] text-text-secondary">Sem tempo</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {time.unknownEvents}{' '}
                  {time.unknownEvents === 1 ? 'registro' : 'registros'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-text-secondary">
              O tempo real vem de minutos informados ou registros em horas/minutos. A
              estimativa usa a duração média cadastrada na obra. Sem esses dados, o tempo
              fica como não informado.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Consumos</h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {data.eventCount} {data.eventCount === 1 ? 'registro' : 'registros'}
                  {data.repeatCount > 0
                    ? ` · ${data.repeatCount} ${
                        data.repeatCount === 1 ? 'revisita' : 'revisitas'
                      }`
                    : ''}
                  {data.lastConsumedOn
                    ? ` · último em ${formatDateBR(data.lastConsumedOn)}`
                    : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEventOpen(true)}>
                <Icon name="plus" size={13} />
                Adicionar
              </Button>
            </div>

            {events.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-text-secondary">
                  Nenhum consumo registrado. Adicione o primeiro para acompanhar o
                  progresso.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-border bg-background px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm text-foreground">
                          {formatDecimal(event.amount)} {event.unitLabel}
                          {event.isRepeat ? (
                            <span className="ml-2 align-middle">
                              <Badge variant="secondary">revisita</Badge>
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {formatDateBR(event.date)}
                        </p>
                        {event.note ? (
                          <p className="mt-1.5 break-words text-xs leading-relaxed text-text-secondary">
                            {event.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-start gap-1">
                        <div className="flex flex-col items-end gap-1.5">
                          <TimeBadge event={event} />
                          {event.durationMinutes != null ? (
                            <span className="text-[10px] text-text-secondary">
                              duração informada
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={`Editar consumo de ${formatDecimal(event.amount)} ${
                            event.unitLabel
                          } em ${formatDateBR(event.date)}`}
                          onClick={() => setEditingEvent(event)}
                        >
                          <Icon name="edit-2" size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-red/10 hover:text-red focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={`Excluir consumo de ${formatDecimal(event.amount)} ${
                            event.unitLabel
                          } em ${formatDateBR(event.date)}`}
                          onClick={() => setDeletingEvent(event)}
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 self-start xl:sticky xl:top-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
              Sobre a obra
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] text-text-secondary">Tipo</dt>
                <dd className="mt-0.5 text-foreground">{data.type.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-text-secondary">Unidade padrão</dt>
                <dd className="mt-0.5 text-foreground">
                  {mediaUnitLabel(data.type.defaultUnit)}
                </dd>
              </div>
              {data.totalUnits != null ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">Total</dt>
                  <dd className="mt-0.5 font-mono text-foreground">
                    {formatDecimal(data.totalUnits)} {data.progress.label}
                  </dd>
                </div>
              ) : null}
              {data.totalVolumes != null ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">Volumes</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{data.totalVolumes}</dd>
                </div>
              ) : null}
              {data.averageDurationMinutes != null ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">
                    Duração média por unidade
                  </dt>
                  <dd className="mt-0.5 font-mono text-foreground">
                    {formatMinutes(data.averageDurationMinutes)}
                  </dd>
                </div>
              ) : null}
              {data.totalDurationMinutes != null ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">Duração total</dt>
                  <dd className="mt-0.5 font-mono text-foreground">
                    {formatMinutes(data.totalDurationMinutes)}
                  </dd>
                </div>
              ) : null}
              {data.startedOn ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">Início</dt>
                  <dd className="mt-0.5 text-foreground">{formatDateBR(data.startedOn)}</dd>
                </div>
              ) : null}
              {data.finishedOn ? (
                <div>
                  <dt className="text-[11px] text-text-secondary">Conclusão</dt>
                  <dd className="mt-0.5 text-foreground">{formatDateBR(data.finishedOn)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] text-text-secondary">Adicionado em</dt>
                <dd className="mt-0.5 text-xs text-text-secondary">
                  {formatDateTimeBR(data.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          {data.notes ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
                Observações
              </h2>
              <p className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-text-secondary">
                {data.notes}
              </p>
            </section>
          ) : null}
        </aside>
      </div>

      <MediaItemDialog
        open={editing}
        onOpenChange={setEditing}
        item={data}
        onSaved={() => {
          handleSaved()
        }}
      />

      <MediaEventDialog
        open={eventOpen || editingEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEventOpen(false)
            setEditingEvent(null)
          }
        }}
        item={data}
        event={editingEvent}
        onSaved={handleEventSaved}
      />

      <MediaConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Excluir “${data.title}”?`}
        description="Todos os consumos registrados para este item também serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir mídia"
        onConfirm={handleDeleteItem}
      />

      <MediaConfirmDialog
        open={deletingEvent !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEvent(null)
        }}
        title="Excluir consumo?"
        description={
          deletingEvent
            ? `O registro de ${formatDecimal(deletingEvent.amount)} ${
                deletingEvent.unitLabel
              } em ${formatDateBR(deletingEvent.date)} será removido.`
            : ''
        }
        confirmLabel="Excluir consumo"
        onConfirm={handleDeleteEvent}
      />
    </div>
  )
}
