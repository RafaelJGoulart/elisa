import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/toast-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MEDIA_SORT_LABELS, MEDIA_STATUS_LABELS, MEDIA_STATUS_ORDER } from '@/lib/media'
import type {
  MediaItem,
  MediaItemSummary,
  MediaSort,
  MediaStatus,
} from '@/features/media/types'
import { mediaService } from '@/services/media'
import { MediaCard } from '../components/MediaCard'
import { MediaConfirmDialog } from '../components/MediaConfirmDialog'
import { MediaItemDialog } from '../components/MediaItemDialog'

const PAGE_SIZE = 12

const ALL = 'all'

export function MediaPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [genre, setGenre] = useState(ALL)
  const [sort, setSort] = useState<MediaSort>('recent')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<MediaItemSummary | null>(null)
  const [deleting, setDeleting] = useState<MediaItemSummary | null>(null)

  const loadMeta = useCallback(async (signal: AbortSignal) => {
    const [types, genres] = await Promise.all([
      mediaService.types(signal),
      mediaService.genres(signal),
    ])
    return { types, genres }
  }, [])
  const meta = useAsyncResource(loadMeta, [])

  const loadItems = useCallback(
    (signal: AbortSignal) =>
      mediaService.list(
        {
          query: debouncedSearch.trim() || undefined,
          type: type === ALL ? undefined : type,
          status: status === ALL ? undefined : (status as MediaStatus),
          genre: genre === ALL ? undefined : genre,
          sort,
          limit: PAGE_SIZE,
          offset,
          includeArchived,
        },
        signal,
      ),
    [debouncedSearch, type, status, genre, sort, offset, includeArchived],
  )

  const { data, loading, error, reload } = useAsyncResource(loadItems, [
    debouncedSearch,
    type,
    status,
    genre,
    sort,
    offset,
    includeArchived,
  ])

  const hasFilters =
    search.trim() !== '' ||
    type !== ALL ||
    status !== ALL ||
    genre !== ALL ||
    includeArchived ||
    sort !== 'recent'

  function clearFilters() {
    setSearch('')
    setType(ALL)
    setStatus(ALL)
    setGenre(ALL)
    setSort('recent')
    setIncludeArchived(false)
    setOffset(0)
  }

  function handleSaved(item: MediaItem) {
    setCreateOpen(false)
    setEditing(null)
    reload()
    toast({
      title: editing ? 'Mídia atualizada' : 'Mídia adicionada',
      description:
        item.status === 'in_progress' && !item.totalUnits
          ? 'Você pode registrar consumos na página de detalhes.'
          : 'O item já está salvo no banco local.',
      variant: 'success',
    })
  }

  async function handleDelete() {
    if (!deleting) return
    const title = deleting.title
    await mediaService.remove(deleting.id)
    setDeleting(null)
    reload()
    toast({
      title: `“${title}” foi excluído`,
      description: 'O item e todos os consumos associados foram removidos.',
      variant: 'success',
    })
  }

  const total = data?.total ?? 0
  const showingFrom = total === 0 ? 0 : offset + 1
  const showingTo = Math.min(offset + PAGE_SIZE, total)
  const canGoBack = offset > 0
  const canGoForward = offset + PAGE_SIZE < total

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Módulo"
        title="Mídia"
        description="Acompanhe animes, séries, filmes, livros, jogos e o que mais fizer parte do seu acervo. Consumos são registros independentes — revisitas somam no total, mas não inflam o progresso."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/midia/estatisticas">
                <Icon name="bar-chart-2" size={14} />
                Estatísticas
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} />
              Nova mídia
            </Button>
          </>
        }
      />

      <section
        aria-label="Filtros do acervo"
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]"
      >
        <div className="relative">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-disabled"
          />
          <Input
            aria-label="Buscar mídia"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setOffset(0)
            }}
            placeholder="Buscar por título…"
            className="pl-9"
          />
        </div>

        <Select
          value={type}
          onValueChange={(value) => {
            setType(value)
            setOffset(0)
          }}
        >
          <SelectTrigger aria-label="Filtrar por tipo">
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

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setOffset(0)
          }}
        >
          <SelectTrigger aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os estados</SelectItem>
            {MEDIA_STATUS_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {MEDIA_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={genre}
          onValueChange={(value) => {
            setGenre(value)
            setOffset(0)
          }}
        >
          <SelectTrigger aria-label="Filtrar por gênero">
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

        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as MediaSort)
            setOffset(0)
          }}
        >
          <SelectTrigger aria-label="Ordenar mídia">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MEDIA_SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-full">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked)
                setOffset(0)
              }}
              className="size-4 rounded border-border bg-background accent-primary"
            />
            Incluir arquivados
          </label>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <Icon name="x" size={13} />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </section>

      {loading && !data ? <LoadingState rows={3} /> : null}

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : null}

      {data && total === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="search"
            title="Nenhuma mídia encontrada"
            description="Tente outro termo ou remova filtros para ver o acervo completo."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="film"
            title="Comece seu acervo"
            description="Adicione uma obra para acompanhar progresso, consumo e tempo. Você define o tipo, os gêneros e o total quando souber."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Icon name="plus" size={15} />
                Adicionar primeira mídia
              </Button>
            }
          />
        )
      ) : null}

      {data && total > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              {showingFrom}–{showingTo} de {total}{' '}
              {total === 1 ? 'item' : 'itens'}
              {loading ? ' · atualizando…' : ''}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onEdit={(selected) => setEditing(selected)}
                onDelete={(selected) => setDeleting(selected)}
              />
            ))}
          </div>

          <nav
            className="flex items-center justify-between gap-3 border-t border-border pt-4"
            aria-label="Paginação do acervo"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoBack || loading}
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            >
              <Icon name="chevron-left" size={14} />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoForward || loading}
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
            >
              Próxima
              <Icon name="chevron-right" size={14} />
            </Button>
          </nav>
        </>
      ) : null}

      <MediaItemDialog
        open={createOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditing(null)
          }
        }}
        item={editing}
        onSaved={handleSaved}
        onTypeCreated={() => {
          meta.reload()
          reload()
        }}
      />

      <MediaConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Excluir “${deleting?.title ?? ''}”?`}
        description="Todos os consumos registrados para este item também serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir mídia"
        onConfirm={handleDelete}
      />

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-text-secondary"
          onClick={() => navigate('/midia/estatisticas')}
        >
          Ver estatísticas do acervo
          <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </div>
  )
}
