import { useEffect, useRef, useState, type FormEvent } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { CATEGORY_SUGGESTIONS } from '@/lib/categories'
import type { ActivityColor } from '@/lib/colors'
import { focusFirstErroredField } from '@/lib/focus'
import type {
  Activity,
  ActivityFrequency,
  ActivityInput,
  ActivityKind,
  MeasurementUnit,
} from '@/features/activities/types'
import {
  getErrorMessage,
  activitiesService,
  unitsService,
} from '@/services/activities'

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

type FieldErrors = Partial<
  Record<
    | 'name'
    | 'description'
    | 'category'
    | 'kind'
    | 'unitId'
    | 'targetAmount'
    | 'frequency'
    | 'customUnitName'
    | 'customUnitSymbol',
    string
  >
>

const FIELD_NAMES = [
  'name',
  'description',
  'category',
  'kind',
  'unitId',
  'targetAmount',
  'frequency',
  'customUnitName',
  'customUnitSymbol',
] as const

function extractServerFields(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  if (!details || typeof details !== 'object' || !('fields' in details)) return {}

  const fields = (details as { fields?: unknown }).fields
  if (!fields || typeof fields !== 'object') return {}

  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(fields)) {
    if (FIELD_NAMES.includes(key as (typeof FIELD_NAMES)[number]) && typeof value === 'string') {
      result[key as keyof FieldErrors] = value
    }
  }
  return result
}

const FREQUENCY_LABELS: Record<ActivityFrequency, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

const FREQUENCY_GOAL_LABELS: Record<ActivityFrequency, string> = {
  daily: 'Meta por dia',
  weekly: 'Meta por semana',
  monthly: 'Meta por mês',
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
  const [kind, setKind] = useState<ActivityKind>(activity?.kind ?? 'binary')
  const [frequency, setFrequency] = useState<ActivityFrequency>(
    activity?.frequency ?? 'daily',
  )
  const [unitId, setUnitId] = useState<number | null>(activity?.unit?.id ?? null)
  const [target, setTarget] = useState(
    activity?.targetAmount != null ? String(activity.targetAmount) : '',
  )
  const [units, setUnits] = useState<MeasurementUnit[]>(
    activity?.unit ? [activity.unit] : [],
  )
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [unitsError, setUnitsError] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customSymbol, setCustomSymbol] = useState('')
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const customNameRef = useRef<HTMLInputElement>(null)
  const customSymbolRef = useRef<HTMLInputElement>(null)

  const fieldRefs = {
    name: nameRef,
    category: categoryRef,
    description: descriptionRef,
    targetAmount: targetRef,
    customUnitName: customNameRef,
    customUnitSymbol: customSymbolRef,
  }
  const fieldOrder = [
    'name',
    'category',
    'kind',
    'unitId',
    'targetAmount',
    'frequency',
    'description',
    'customUnitName',
    'customUnitSymbol',
  ] as const

  useEffect(() => {
    const controller = new AbortController()
    unitsService
      .list(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setUnits((current) => {
          const merged = [...list]
          for (const unit of current) {
            if (!merged.some((item) => item.id === unit.id)) merged.push(unit)
          }
          return merged
        })
        setUnitsError(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setUnitsError(getErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setUnitsLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function handleCreateUnit() {
    setErrors((current) => ({
      ...current,
      customUnitName: undefined,
      customUnitSymbol: undefined,
    }))
    if (!customName.trim() || !customSymbol.trim()) {
      const next: FieldErrors = {}
      if (!customName.trim()) next.customUnitName = 'Informe um nome para a unidade.'
      if (!customSymbol.trim()) next.customUnitSymbol = 'Informe um símbolo curto.'
      setErrors((current) => ({ ...current, ...next }))
      focusFirstErroredField(next, fieldRefs, fieldOrder)
      return
    }
    setCreatingUnit(true)
    setFormError(null)
    try {
      const unit = await unitsService.create({
        name: customName.trim(),
        symbol: customSymbol.trim(),
      })
      setUnits((current) => [...current, unit])
      setUnitId(unit.id)
      setCustomName('')
      setCustomSymbol('')
      setCustomOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setCreatingUnit(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = formSchema.safeParse({ name, description, category })
    const nextErrors: FieldErrors = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (
          (field === 'name' || field === 'description' || field === 'category') &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message
        }
      }
    }

    if (kind === 'measurable') {
      if (unitId === null) {
        nextErrors.unitId = 'Escolha a unidade de medida.'
      }
      if (target.trim()) {
        const parsedTarget = Number(target.replace(',', '.'))
        if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
          nextErrors.targetAmount = 'Use uma meta maior que zero.'
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      focusFirstErroredField(nextErrors, fieldRefs, fieldOrder)
      return
    }

    setErrors({})
    setSaving(true)

    const parsedTarget = target.trim() ? Number(target.replace(',', '.')) : null
    const input: ActivityInput = {
      name: parsed.success ? parsed.data.name : name.trim(),
      description:
        parsed.success && parsed.data.description.length > 0
          ? parsed.data.description
          : null,
      category: parsed.success ? parsed.data.category : category.trim(),
      color,
      kind,
      frequency: kind === 'measurable' ? frequency : 'daily',
      unitId: kind === 'measurable' ? unitId : null,
      targetAmount: kind === 'measurable' ? parsedTarget : null,
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
        focusFirstErroredField(serverFields, fieldRefs, fieldOrder)
      }
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const unitOptions = [...units].sort((a, b) =>
    `${a.category} ${a.name}`.localeCompare(`${b.category} ${b.name}`, 'pt-BR'),
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="activity-name">Nome</Label>
        <Input
          id="activity-name"
          ref={nameRef}
          name="activity-name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Leitura, Corrida, Beber água"
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
        <Label htmlFor="activity-kind">Tipo de hábito</Label>
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as ActivityKind)}
          disabled={saving}
        >
          <SelectTrigger id="activity-kind" aria-label="Tipo de hábito">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="binary">Binário — marcar conclusão</SelectItem>
            <SelectItem value="measurable">Mensurável — registrar quantidade</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-text-secondary">
          {kind === 'binary'
            ? 'Você marca o dia como concluído. A frequência é diária.'
            : 'Você registra quantidades e pode definir uma meta por período.'}
        </p>
      </div>

      {kind === 'measurable' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activity-unit">Unidade de medida</Label>
              <Select
                value={unitId !== null ? String(unitId) : undefined}
                onValueChange={(value) => setUnitId(Number(value))}
                disabled={saving || unitsLoading}
              >
                <SelectTrigger id="activity-unit" aria-label="Unidade de medida">
                  <SelectValue
                    placeholder={unitsLoading ? 'Carregando…' : 'Escolha a unidade'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit.id} value={String(unit.id)}>
                      {unit.category} · {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unitId ? (
                <p role="alert" className="text-xs text-red">
                  {errors.unitId}
                </p>
              ) : null}
              {unitsError ? (
                <p role="alert" className="text-xs text-red">
                  {unitsError}
                </p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-7 px-2 text-text-secondary"
                onClick={() => setCustomOpen((current) => !current)}
              >
                <Icon name="plus-circle" size={13} />
                Unidade personalizada
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-frequency">Frequência</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as ActivityFrequency)}
                disabled={saving}
              >
                <SelectTrigger id="activity-frequency" aria-label="Frequência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {customOpen ? (
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">
                A unidade personalizada tem dimensão própria e não é convertida para
                outras unidades. Isso evita somas incorretas.
              </p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-unit-name">Nome da unidade</Label>
                  <Input
                    id="custom-unit-name"
                    ref={customNameRef}
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    placeholder="Ex.: Xícara"
                    maxLength={40}
                    aria-invalid={Boolean(errors.customUnitName)}
                  />
                  {errors.customUnitName ? (
                    <p role="alert" className="text-xs text-red">
                      {errors.customUnitName}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-unit-symbol">Símbolo</Label>
                  <Input
                    id="custom-unit-symbol"
                    ref={customSymbolRef}
                    value={customSymbol}
                    onChange={(event) => setCustomSymbol(event.target.value)}
                    placeholder="xíc."
                    maxLength={12}
                    aria-invalid={Boolean(errors.customUnitSymbol)}
                  />
                  {errors.customUnitSymbol ? (
                    <p role="alert" className="text-xs text-red">
                      {errors.customUnitSymbol}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="self-end"
                  onClick={() => void handleCreateUnit()}
                  disabled={creatingUnit}
                >
                  {creatingUnit ? (
                    <Icon name="loader" size={14} className="animate-spin" />
                  ) : (
                    <Icon name="plus" size={14} />
                  )}
                  Criar
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="activity-target">
              {FREQUENCY_GOAL_LABELS[frequency]} (opcional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="activity-target"
                ref={targetRef}
                inputMode="decimal"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Ex.: 2"
                aria-invalid={Boolean(errors.targetAmount)}
                aria-describedby={errors.targetAmount ? 'activity-target-error' : undefined}
              />
              <span className="shrink-0 font-mono text-sm text-text-secondary">
                {unitId !== null
                  ? units.find((unit) => unit.id === unitId)?.symbol ?? ''
                  : ''}
              </span>
            </div>
            {errors.targetAmount ? (
              <p id="activity-target-error" role="alert" className="text-xs text-red">
                {errors.targetAmount}
              </p>
            ) : null}
            <p className="text-xs text-text-secondary">
              Sem meta, o hábito conta os dias em que houver registro. A meta não
              limita o quanto você pode registrar.
            </p>
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="activity-category">Categoria</Label>
        <Input
          id="activity-category"
          ref={categoryRef}
          name="activity-category"
          autoComplete="off"
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
          ref={descriptionRef}
          name="activity-description"
          autoComplete="off"
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
          <span className="font-mono text-[10px] text-text-secondary">
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da atividade. O histórico de registros é preservado.'
              : 'Escolha entre marcar conclusões ou acompanhar quantidades com uma meta.'}
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
