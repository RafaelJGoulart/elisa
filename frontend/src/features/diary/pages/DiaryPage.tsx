import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/toast-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { DiaryComposer } from '@/features/diary/components/DiaryComposer'
import { DiaryEditorDialog } from '@/features/diary/components/DiaryEditorDialog'
import { DiaryEntryDialog } from '@/features/diary/components/DiaryEntryDialog'
import { DiaryEntryList } from '@/features/diary/components/DiaryEntryList'
import { DeleteDiaryEntryDialog } from '@/features/diary/components/DeleteDiaryEntryDialog'
import type {
  DiaryEntry,
  DiaryEntrySummary,
  DiaryListFilters,
} from '@/features/diary/types'
import { diaryService } from '@/services/diary'

const MONTH_PATTERN = /^\d{4}-\d{2}$/

export function DiaryPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryInput, setQueryInput] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<
    Pick<DiaryEntrySummary, 'id' | 'title'> | null
  >(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const monthParam = searchParams.get('month')
  const month = monthParam && MONTH_PATTERN.test(monthParam) ? monthParam : null
  const debouncedQuery = useDebouncedValue(queryInput, 300)
  const filters = useMemo<DiaryListFilters>(
    () => ({ query: debouncedQuery.trim(), month }),
    [debouncedQuery, month],
  )

  function updateMonth(next: string | null) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('month', next)
    else params.delete('month')
    setSearchParams(params, { replace: true })
  }

  function resetFilters() {
    setQueryInput('')
    updateMonth(null)
  }

  function focusComposer() {
    document
      .getElementById('diary-composer')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => contentRef.current?.focus(), 250)
  }

  function handleCreated() {
    setSelectedId(null)
    setQueryInput('')
    updateMonth(null)
    setReloadToken((current) => current + 1)
    toast({
      title: 'Registro salvo',
      description: 'Seu texto foi gravado como Markdown e já está no índice local.',
      variant: 'success',
    })
  }

  function handleSaved(entry: DiaryEntry) {
    setEditingEntry(null)
    setSelectedId(null)
    setReloadToken((current) => current + 1)
    toast({
      title: 'Registro atualizado',
      description: `As alterações em “${entry.title || 'Sem título'}” já foram salvas.`,
      variant: 'success',
    })
  }

  async function handleDelete() {
    if (!deletingEntry) return
    await diaryService.remove(deletingEntry.id)
    setDeletingEntry(null)
    setSelectedId(null)
    setReloadToken((current) => current + 1)
    toast({
      title: 'Registro excluído',
      description: 'O arquivo Markdown foi removido deste computador.',
      variant: 'success',
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Módulo"
        title="Diário"
        description="Um lugar para escrever sem pressa. Seus registros ficam em arquivos Markdown neste computador; a busca usa um índice local que pode ser reconstruído a qualquer momento."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Icon name="hard-drive" size={12} />
            Markdown local
          </Badge>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <DiaryComposer onSaved={handleCreated} contentRef={contentRef} />

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3.5">
            <Icon name="database" size={15} className="mt-0.5 text-text-disabled" />
            <p className="text-[11px] leading-relaxed text-text-secondary">
              O texto original vive em <span className="font-mono">data/diary</span>. O
              SQLite guarda apenas título, data e etiquetas para busca — nenhum serviço
              externo está conectado.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section aria-label="Buscar registros" className="space-y-3">
            <div className="relative">
              <Icon
                name="search"
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-disabled"
              />
              <Input
                type="search"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Buscar por título, conteúdo ou etiqueta"
                aria-label="Buscar registros do Diário"
                className="pr-9 pl-9"
              />
              {queryInput ? (
                <button
                  type="button"
                  onClick={() => setQueryInput('')}
                  aria-label="Limpar busca"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-text-disabled transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icon name="x" size={13} />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="diary-month" className="sr-only">
                Filtrar por mês
              </label>
              <Input
                id="diary-month"
                type="month"
                value={month ?? ''}
                onChange={(event) => updateMonth(event.target.value || null)}
                className="w-44 text-xs"
              />
              {month ? (
                <Button variant="ghost" size="sm" onClick={() => updateMonth(null)}>
                  <Icon name="x" size={13} />
                  Mês
                </Button>
              ) : null}
              {queryInput || month ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </section>

          <DiaryEntryList
            filters={filters}
            reloadToken={reloadToken}
            selectedId={selectedId}
            onSelect={(entry) => setSelectedId(entry.id)}
            onResetFilters={resetFilters}
            onStartWriting={focusComposer}
          />
        </div>
      </div>

      {selectedId ? (
        <DiaryEntryDialog
          entryId={selectedId}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedId(null)
          }}
          onEdit={(entry) => {
            setSelectedId(null)
            setEditingEntry(entry)
          }}
          onDelete={(entry) => {
            setSelectedId(null)
            setDeletingEntry(entry)
          }}
        />
      ) : null}

      {editingEntry ? (
        <DiaryEditorDialog
          key={editingEntry.id}
          open
          entry={editingEntry}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null)
          }}
          onSaved={handleSaved}
        />
      ) : null}

      <DeleteDiaryEntryDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEntry(null)
        }}
        entryTitle={deletingEntry?.title ?? ''}
        onConfirm={handleDelete}
      />
    </div>
  )
}
