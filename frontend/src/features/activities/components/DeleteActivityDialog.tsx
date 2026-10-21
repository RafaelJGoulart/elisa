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
import { getErrorMessage } from '@/services/activities'

interface DeleteActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activityName: string
  onConfirm: () => Promise<void>
}

export function DeleteActivityDialog({
  open,
  onOpenChange,
  activityName,
  onConfirm,
}: DeleteActivityDialogProps) {
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
          <AlertDialogTitle>Excluir “{activityName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os registros desta atividade também serão removidos. Esta ação não pode ser
            desfeita. Considere fazer um backup do banco antes de continuar.
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
            {deleting ? 'Excluindo…' : 'Excluir atividade'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
