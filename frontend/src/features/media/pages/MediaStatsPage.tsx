import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { formatDateBR, shiftDateKey, todayKey } from '@/lib/dates'
import { formatDecimal, formatMinutes } from '@/lib/format'
import { formatMonthLabel, mediaTypeIcon } from '@/lib/media'
import { mediaService } from '@/services/media'
import { MediaProgressBar } from '../components/MediaProgressBar'

const RANGES = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
] as const

const ALL = 'all'

export function MediaStatsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('90')
  const [type, setType] = useState(ALL)
  const [genre, setGenre] = useState(ALL)

  const start = useMemo(
    () => shiftDateKey(todayKey(), -(Number(range) - 1)),
    [range],
  )
  const end = todayKey()

  const loadMeta = useCallback(async (signal: AbortSignal) => {
    const [types, genres] = await Promise.all([
      mediaService.types(signal),
      mediaService.genres(signal),
    ])
    return { types, genres }
  }, [])
  const meta = useAsyncResource(loadMeta, [])

  const loadStats = useCallback(
    (signal: AbortSignal) =>
      mediaService.stats(
        {
          start,
          end,
          type: type === ALL ? undefined : type,
          genre: genre === ALL ? undefined : genre,
        },
        signal,
      ),
    [start, end, type, genre],
  )
  const { data, loading, error, reload } = useAsyncResource(loadStats, [
    start,
    end,
    type,
    genre,
  ])

  const maxTypeCount = data
    ? Math.max(1, ...data.byType.map((entry) => entry.count))
    : 1
  const maxGenreCount = data
    ? Math.max(1, ...data.byGenre.map((entry) => entry.count))
    : 1

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/midia"
          className="inline-flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" size={14} />
          Mídia
        </Link>
      </div>

      <PageHeader
        eyebrow="Mídia"
        title="Estatísticas"
        description="Leia os números do seu consumo sem misturar tempo real com estimativas. Obras concluídas são contadas uma única vez; revisitas aparecem no consumo."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/midia">
              <Icon name="list" size={14} />
              Voltar ao acervo
            </Link>
          </Button>
        }
      />

      <section
        aria-label="Filtros das estatísticas"
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3"
      >
        <Select
          value={range}
          onValueChange={(value) => setRange(value as (typeof RANGES)[number]['value'])}
        >
          <SelectTrigger aria-label="Período das estatísticas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Filtrar estatísticas por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {meta.data?.types.map((item) => (
              <SelectItem key={item.id} value={item.code}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger aria-label="Filtrar estatísticas por gênero">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os gêneros</SelectItem>
            {meta.data?.genres.map((item) => (
              <SelectItem key={item.id} value={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-text-secondary sm:col-span-3">
          Período analisado: {formatDateBR(start)} a {formatDateBR(end)}.
        </p>
      </section>

      {loading && !data ? <LoadingState rows={4} /> : null}

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : null}

      {data && data.totals.items === 0 && data.totals.events === 0 ? (
        <EmptyState
          icon="bar-chart-2"
          title="Ainda não há números"
          description="Adicione itens ao acervo e registre consumos para ver estatísticas de quantidade, tempo e histórico mensal."
          action={
            <Button asChild size="sm">
              <Link to="/midia">Ir para o acervo</Link>
            </Button>
          }
        />
      ) : null}

      {data && (data.totals.items > 0 || data.totals.events > 0) ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { icon: 'layers', label: 'Itens', value: String(data.totals.items) },
              {
                icon: 'check-circle',
                label: 'Concluídos',
                value: String(data.totals.completed),
              },
              {
                icon: 'play-circle',
                label: 'Em andamento',
                value: String(data.totals.inProgress),
              },
              { icon: 'archive', label: 'Arquivados', value: String(data.totals.archived) },
              { icon: 'activity', label: 'Consumos', value: String(data.totals.events) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-surface px-4 py-3.5"
              >
                <dt className="flex items-center gap-2 text-[11px] text-text-secondary">
                  <Icon name={item.icon} size={13} className="text-text-disabled" />
                  {item.label}
                </dt>
                <dd className="mt-1.5 font-mono text-xl font-medium tracking-tight text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Tempo no período</h2>
              <p className="mt-1 text-xs text-text-secondary">
                {data.time.unknownEvents > 0
                  ? `${data.time.unknownEvents} ${
                      data.time.unknownEvents === 1 ? 'registro está' : 'registros estão'
                    } sem tempo informado.`
                  : 'Todos os registros têm tempo real ou estimado.'}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-[11px] text-text-secondary">Real</dt>
                  <dd className="mt-1 font-mono text-sm text-foreground">
                    {formatMinutes(data.time.realMinutes)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-[11px] text-text-secondary">Estimado</dt>
                  <dd className="mt-1 font-mono text-sm text-foreground">
                    ~ {formatMinutes(data.time.estimatedMinutes)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-[11px] text-text-secondary">Conhecido</dt>
                  <dd className="mt-1 font-mono text-sm text-foreground">
                    {formatMinutes(data.time.totalKnownMinutes)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-[11px] text-text-secondary">Sem tempo</dt>
                  <dd className="mt-1 font-mono text-sm text-foreground">
                    {data.time.unknownEvents}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Quantidades</h2>
              <p className="mt-1 text-xs text-text-secondary">
                Unidades diferentes não são somadas entre si.
              </p>
              {data.quantities.length === 0 ? (
                <p className="mt-4 text-xs text-text-secondary">
                  Nenhum consumo registrado neste período.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {data.quantities.map((quantity) => (
                    <li
                      key={quantity.unit}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <span className="text-xs text-text-secondary">
                        {quantity.label}
                      </span>
                      <span className="font-mono text-sm text-foreground">
                        {formatDecimal(quantity.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Por tipo</h2>
              {data.byType.length === 0 ? (
                <p className="mt-3 text-xs text-text-secondary">Nenhum item.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.byType.map((entry) => (
                    <li key={entry.code}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2 text-foreground">
                          <Icon
                            name={mediaTypeIcon({ code: entry.code })}
                            size={13}
                            className="text-text-disabled"
                          />
                          {entry.type}
                        </span>
                        <span className="font-mono text-text-secondary">
                          {entry.count} {entry.count === 1 ? 'item' : 'itens'} ·{' '}
                          {entry.completed} concl.
                        </span>
                      </div>
                      <MediaProgressBar
                        className="mt-1.5"
                        percent={(entry.count / maxTypeCount) * 100}
                        label={`${entry.type}: ${entry.count} itens`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Por gênero</h2>
              {data.byGenre.length === 0 ? (
                <p className="mt-3 text-xs text-text-secondary">Nenhum gênero.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.byGenre.map((entry) => (
                    <li key={entry.name}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground">{entry.name}</span>
                        <span className="font-mono text-text-secondary">
                          {entry.count}
                        </span>
                      </div>
                      <MediaProgressBar
                        className="mt-1.5"
                        percent={(entry.count / maxGenreCount) * 100}
                        label={`${entry.name}: ${entry.count} itens`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Histórico mensal</h2>
            {data.months.length === 0 ? (
              <p className="mt-3 text-xs text-text-secondary">
                Nenhum mês com registros no período.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {[...data.months].reverse().map((month) => (
                  <li
                    key={month.month}
                    className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground first-letter:uppercase">
                        {formatMonthLabel(month.month)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {month.eventCount}{' '}
                        {month.eventCount === 1 ? 'consumo' : 'consumos'}
                        {month.unknownEvents > 0
                          ? ` · ${month.unknownEvents} sem tempo`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {month.quantities.map((quantity) => (
                        <Badge key={quantity.unit} variant="secondary">
                          {formatDecimal(quantity.amount)} {quantity.label}
                        </Badge>
                      ))}
                      {month.realMinutes > 0 ? (
                        <Badge variant="success">
                          {formatMinutes(month.realMinutes)} reais
                        </Badge>
                      ) : null}
                      {month.estimatedMinutes > 0 ? (
                        <Badge variant="warning">
                          ~ {formatMinutes(month.estimatedMinutes)} est.
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Consumos recentes</h2>
              <Link
                to="/midia"
                className="text-xs text-text-secondary transition-colors hover:text-foreground"
              >
                Ver acervo
              </Link>
            </div>
            {data.recentEvents.length === 0 ? (
              <p className="mt-3 text-xs text-text-secondary">
                Nenhum consumo no período analisado.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {data.recentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/midia/${event.mediaItemId}`}
                        className="block truncate text-sm text-foreground transition-colors hover:text-primary"
                      >
                        {event.item?.title ?? 'Mídia'}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {formatDateBR(event.date)} · {formatDecimal(event.amount)}{' '}
                        {event.unitLabel}
                        {event.isRepeat ? ' · revisita' : ''}
                      </p>
                    </div>
                    <Badge
                      variant={
                        event.timeKind === 'real'
                          ? 'success'
                          : event.timeKind === 'estimated'
                            ? 'warning'
                            : 'outline'
                      }
                    >
                      {event.timeKind === 'unknown'
                        ? 'sem tempo'
                        : event.timeKind === 'real'
                          ? `${formatMinutes(event.knownMinutes ?? 0)} reais`
                          : `~ ${formatMinutes(event.estimatedMinutes ?? 0)} est.`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
