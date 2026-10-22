import { useCallback } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fromDateKey, toDateKey, todayKey } from '@/lib/dates'
import { formatEntryTime, groupEntriesByDate } from '@/lib/diary'
import { getErrorMessage } from '@/lib/errors'
import { diaryService } from '@/services/diary'
import type { DiaryEntrySummary, DiaryListFilters } from '@/features/diary/types'

const PAGE_SIZE = 50

interface DiaryEntryListProps {
  filters: DiaryListFilters
  reloadToken: number
  selectedId: string | null
  onSelect: (entry: DiaryEntrySummary) => void
  onResetFilters: () => void
  onStartWriting: () => void
}

function groupLabel(dateKey: string): string {
  if (dateKey === todayKey()) return 'Hoje'
  if (dateKey === toDateKey(subDays(new Date(), 1))) return 'Ontem'
  const label = format(fromDateKey(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}

export function DiaryEntryList({
  filters,
  reloadToken,
  selectedId,
  onSelect,
  onResetFilters,
  onStartWriting,
}: DiaryEntryListProps) {
  const loadEntries = useCallback(
    (signal: AbortSignal) =>
      diaryService.list({
        query: filters.query || undefined,
        month: filters.month ?? undefined,
        limit: PAGE_SIZE,
        signal,
      }),
    [filters.query, filters.month],
  )
  const { data, loading, error, reload } = useAsyncResource(
    loadEntries,
    [filters.query, filters.month, reloadToken],
  )

  if (loading && !data) {
    return <LoadingState rows={4} />
  }

  if (error && !data) {
    return (
      <ErrorState
        title="Não foi possível carregar o Diário"
        message={getErrorMessage(error)}
        onRetry={reload}
      />
    )
  }

  if (!data) return null

  const hasFilters = Boolean(filters.query || filters.month)
  const groups = groupEntriesByDate(data.entries)

  if (data.entries.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          icon="search"
          title="Nenhum registro encontrado"
          description={
            filters.query
              ? `Nada corresponde a “${filters.query}” neste momento. Tente outras palavras ou remova os filtros.`
              : 'Não há registros neste mês. Escolha outro mês ou volte para todos os registros.'
          }
          action={
            <Button variant="outline" onClick={onResetFilters}>
              <Icon name="x" size={14} />
              Limpar filtros
            </Button>
          }
        />
      )
    }

    return (
      <EmptyState
        icon="book-open"
        title="Seu Diário começa aqui"
        description="Escreva sobre o dia, uma ideia solta ou algo que queira lembrar depois. Cada registro vira um arquivo Markdown no seu computador."
        action={
          <Button onClick={onStartWriting}>
            <Icon name="feather" size={15} />
            Escrever o primeiro registro
          </Button>
        }
      />
    )
  }

  return (
    <div className="relative space-y-6" aria-busy={loading}>
      {loading ? (
        <p className="text-[11px] text-text-secondary" role="status">
          Atualizando registros…
        </p>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {data.entries.length}{' '}
        {data.entries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
        {data.hasMore ? ', mostrando os mais recentes' : ''}.
      </p>

      {groups.map((group) => (
        <section key={group.dateKey} aria-labelledby={`diary-group-${group.dateKey}`}>
          <h2
            id={`diary-group-${group.dateKey}`}
            className="mb-2 px-1 text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase"
          >
            {groupLabel(group.dateKey)}
          </h2>
          <div className="space-y-2">
            {group.entries.map((entry) => {
              const selected = entry.id === selectedId
              const visibleTags = entry.tags.slice(0, 3)
              const hiddenTags = entry.tags.length - visibleTags.length

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelect(entry)}
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'group w-full rounded-xl border bg-surface px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-5',
                    selected
                      ? 'border-primary/50 bg-surface-raised'
                      : 'border-border hover:border-text-disabled/50 hover:bg-surface-raised/60',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {entry.title || (
                        <span className="font-normal text-text-secondary italic">
                          Sem título
                        </span>
                      )}
                    </span>
                    <time
                      dateTime={entry.createdAt}
                      className="shrink-0 font-mono text-[11px] text-text-secondary"
                    >
                      {formatEntryTime(entry.createdAt)}
                    </time>
                  </div>

                  {entry.excerpt ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                      {entry.excerpt}
                    </p>
                  ) : null}

                  {entry.tags.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {visibleTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {hiddenTags > 0 ? (
                        <span className="text-[10px] text-text-secondary">
                          +{hiddenTags}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {data.hasMore ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-text-secondary">
          {data.entries.length} registros mais recentes exibidos. Use a busca ou filtre por
          mês para encontrar registros anteriores.
        </div>
      ) : null}
    </div>
  )
}
