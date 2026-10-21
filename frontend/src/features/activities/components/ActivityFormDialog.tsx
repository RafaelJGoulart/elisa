import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { ColorSwatchPicker } from '@/components/shared/ColorSwatchPicker'
import { Icon } from '@/components/shared/Icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { CATEGORY_SUGGESTIONS } from '@/lib/categories'
import type { ActivityColor } from '@/lib/colors'
import type { Activity, ActivityInput } from '@/features/activities/types'
import { getErrorMessage, activitiesService } from '@/services/activities'

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(80, 'Use no máximo 80 caracteres.'),
  description: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
  category: z
    .string()
    .trim()
    .min(1, 'Informe uma categoria.')
    .max(40, 'Use no máximo 40 caracteres.'),
})

interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: Activity | null
  onSaved: (activity: Activity) => void
}

type FieldErrors = Partial<Record<'name' | 'description' | 'category', string>>

function extractServerFields(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  if (!details || typeof details !== 'object' || !('fields' in details)) return {}

  const fields = (details as { fields?: unknown }).fields
  if (!fields || typeof fields !== 'object') return {}

  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(fields)) {
    if (
      (key === 'name' || key === 'description' || key === 'category') &&
      typeof value === 'string'
    ) {
      result[key] = value
    }
  }
  return result
}

interface ActivityFormProps {
  activity?: Activity | null
  onSaved: (activity: Activity) => void
  onCancel: () => void
}

function ActivityForm({ activity, onSaved, onCancel }: ActivityFormProps) {
  const isEditing = Boolean(activity)
  const [name, setName] = useState(activity?.name ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [category, setCategory] = useState(activity?.category ?? '')
  const [color, setColor] = useState<ActivityColor>(activity?.color ?? 'purple')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = formSchema.safeParse({ name, description, category })
    if (!parsed.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (
          (field === 'name' || field === 'description' || field === 'category') &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message
        }
      }
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSaving(true)

    const input: ActivityInput = {
      name: parsed.data.name,
      description: parsed.data.description.length > 0 ? parsed.data.description : null,
      category: parsed.data.category,
      color,
    }

    try {
      const saved = activity
        ? await activitiesService.update(activity.id, input)
        : await activitiesService.create(input)
      onSaved(saved)
    } catch (error) {
      const serverFields = extractServerFields(error)
      if (Object.keys(serverFields).length > 0) {
        setErrors(serverFields)
      }
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="activity-name">Nome</Label>
        <Input
          id="activity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Leitura, Corrida, Estudo de alemão"
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'activity-name-error' : undefined}
          autoFocus
        />
        {errors.name ? (
          <p id="activity-name-error" role="alert" className="text-xs text-red">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-category">Categoria</Label>
        <Input
          id="activity-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Ex.: Saúde"
          list="activity-category-suggestions"
          maxLength={40}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? 'activity-category-error' : undefined}
        />
        <datalist id="activity-category-suggestions">
          {CATEGORY_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        {errors.category ? (
          <p id="activity-category-error" role="alert" className="text-xs text-red">
            {errors.category}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-description">Descrição (opcional)</Label>
        <Textarea
          id="activity-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Um lembrete curto sobre o que conta como concluir esta atividade."
          maxLength={500}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'activity-description-error' : undefined}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.description ? (
            <p id="activity-description-error" role="alert" className="text-xs text-red">
              {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] text-text-disabled">
            {description.length}/500
          </span>
        </div>
      </div>

      <ColorSwatchPicker
        name="activity-color"
        value={color}
        onChange={setColor}
        disabled={saving}
      />

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-xs text-red"
        >
          <Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Icon name="loader" size={14} className="animate-spin" />
              Salvando…
            </>
          ) : isEditing ? (
            'Salvar alterações'
          ) : (
            'Criar atividade'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  onSaved,
}: ActivityFormDialogProps) {
  const isEditing = Boolean(activity)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da atividade. O histórico de registros é preservado.'
              : 'Defina um nome, uma categoria e uma cor para identificar esta atividade.'}
          </DialogDescription>
        </DialogHeader>

        <ActivityForm
          key={activity?.id ?? 'new'}
          activity={activity}
          onSaved={(saved) => {
            onSaved(saved)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
