import { useCallback } from 'react'

import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import {
  formatEntryDateTime,
  formatEntryTime,
  isEdited,
} from '@/lib/diary'
import { getErrorMessage } from '@/lib/errors'
import { diaryService } from '@/services/diary'
import type { DiaryEntry } from '@/features/diary/types'

interface DiaryEntryDialogProps {
  entryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (entry: DiaryEntry) => void
  onDelete: (entry: DiaryEntry) => void
}

export function DiaryEntryDialog({
  entryId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: DiaryEntryDialogProps) {
  const loadEntry = useCallback(
    (signal: AbortSignal) => diaryService.get(entryId, signal),
    [entryId],
  )
  const { data, loading, error, reload } = useAsyncResource(loadEntry, [entryId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {loading && !data ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Carregando registro</DialogTitle>
              <DialogDescription className="sr-only">
                Lendo o arquivo Markdown do registro.
              </DialogDescription>
            </DialogHeader>
            <LoadingState rows={3} />
          </div>
        ) : null}

        {error && !data ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Não foi possível abrir o registro</DialogTitle>
              <DialogDescription className="sr-only">
                Erro ao ler o arquivo do registro.
              </DialogDescription>
            </DialogHeader>
            <ErrorState message={getErrorMessage(error)} onRetry={reload} />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {data ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="book-open" size={15} className="text-primary" />
                <span className="text-[11px] text-text-secondary">
                  {formatEntryDateTime(data.createdAt)}
                </span>
                {isEdited(data.createdAt, data.updatedAt) ? (
                  <Badge variant="outline">editado</Badge>
                ) : null}
              </div>
              <DialogTitle className="mt-1 text-xl leading-snug">
                {data.title || 'Sem título'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Registro do Diário criado em {formatEntryDateTime(data.createdAt)}.
              </DialogDescription>
            </DialogHeader>

            {data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="max-h-[58svh] overflow-y-auto rounded-lg border border-border bg-background px-4 py-4 sm:px-5">
              <div className="text-sm leading-7 whitespace-pre-wrap break-words text-foreground">
                {data.content}
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(data)}>
                  <Icon name="edit-2" size={14} />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red/30 text-red hover:border-red/50 hover:bg-red/10 hover:text-red"
                  onClick={() => onDelete(data)}
                >
                  <Icon name="trash-2" size={14} />
                  Excluir
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {isEdited(data.createdAt, data.updatedAt) ? (
                  <span className="text-[10px] text-text-disabled">
                    Atualizado às {formatEntryTime(data.updatedAt)}
                  </span>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
