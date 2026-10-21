import { useCallback, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/toast-context'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { activitiesService, getErrorMessage } from '@/services/activities'
import type { Activity } from '@/features/activities/types'
import { ActivityCard } from '../components/ActivityCard'
import { ActivityFormDialog } from '../components/ActivityFormDialog'
import { DeleteActivityDialog } from '../components/DeleteActivityDialog'

export function ActivitiesPage() {
  const loadActivities = useCallback(
    (signal: AbortSignal) => activitiesService.list(signal),
    [],
  )
  const { data, loading, error, reload } = useAsyncResource(loadActivities, [])
  const { toast } = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)

  const formOpen = createOpen || editing !== null

  function closeForm() {
    setCreateOpen(false)
    setEditing(null)
  }

  function handleSaved() {
    const message = editing ? 'Atividade atualizada' : 'Atividade criada'
    closeForm()
    reload()
    toast({
      title: message,
      description: 'As alterações já estão salvas no banco local.',
      variant: 'success',
    })
  }

  async function handleDelete() {
    if (!deleting) return
    const name = deleting.name
    await activitiesService.remove(deleting.id)
    setDeleting(null)
    reload()
    toast({
      title: `“${name}” foi excluída`,
      description: 'A atividade e todos os seus registros foram removidos.',
      variant: 'success',
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Módulo"
        title="Atividades"
        description="Acompanhe o que você faz de forma consistente. Cada quadrado representa um dia real registrado no seu banco local."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={15} />
            Nova atividade
          </Button>
        }
      />

      {loading && !data ? <LoadingState rows={3} /> : null}

      {error && !data ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon="activity"
          title="Comece com uma atividade"
          description="Pode ser algo simples: ler, caminhar, estudar, escrever. Depois você registra os dias em que concluir."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} />
              Criar primeira atividade
            </Button>
          }
        />
      ) : null}

      {data && data.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={(selected) => setEditing(selected)}
              onDelete={(selected) => setDeleting(selected)}
            />
          ))}
        </div>
      ) : null}

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
        activity={editing}
        onSaved={handleSaved}
      />

      <DeleteActivityDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        activityName={deleting?.name ?? ''}
        onConfirm={handleDelete}
      />
    </div>
  )
}
