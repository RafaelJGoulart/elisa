import { useState } from 'react'

import { Icon } from '@/components/shared/Icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getErrorMessage } from '@/lib/errors'

interface DeleteDiaryEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryTitle: string
  onConfirm: () => Promise<void>
}

export function DeleteDiaryEntryDialog({
  open,
  onOpenChange,
  entryTitle,
  onConfirm,
}: DeleteDiaryEntryDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    setDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {entryTitle ? `“${entryTitle}”` : 'este registro'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O arquivo Markdown será removido deste computador. Esta ação não pode ser
            desfeita. Considere fazer um backup antes de continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-xs text-red"
          >
            <Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
          >
            {deleting ? 'Excluindo…' : 'Excluir registro'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
