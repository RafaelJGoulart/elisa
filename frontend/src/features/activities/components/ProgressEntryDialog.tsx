import { useEffect, useRef, useState, type FormEvent } from 'react'

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
import { todayKey } from '@/lib/dates'
import { focusFirstErroredField } from '@/lib/focus'
import type {
  Activity,
  ActivityProgressEntry,
  MeasurementUnit,
  ProgressInput,
} from '@/features/activities/types'
import { activitiesService, getErrorMessage, unitsService } from '@/services/activities'

interface ProgressEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: Activity
  entry?: ActivityProgressEntry | null
  defaultDate?: string
  onSaved: () => void
}

interface FieldErrors {
  amount?: string
  date?: string
  unitId?: string
  note?: string
}

function fieldErrorsFrom(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  if (!details || typeof details !== 'object' || !('fields' in details)) return {}
  const fields = (details as { fields?: unknown }).fields
  if (!fields || typeof fields !== 'object') return {}

  const allowed: Array<keyof FieldErrors> = ['amount', 'date', 'unitId', 'note']
  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key as keyof FieldErrors) && typeof value === 'string') {
      result[key as keyof FieldErrors] = value
    }
  }
  return result
}

interface ProgressFormProps {
  activity: Activity
  entry?: ActivityProgressEntry | null
  defaultDate: string
  onSaved: () => void
  onCancel: () => void
}

function ProgressForm({
  activity,
  entry,
  defaultDate,
  onSaved,
  onCancel,
}: ProgressFormProps) {
  const isEditing = Boolean(entry)
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [date, setDate] = useState(entry?.date ?? defaultDate)
  const [unitId, setUnitId] = useState<number | null>(
    entry?.unit.id ?? activity.unit?.id ?? null,
  )
  const [note, setNote] = useState(entry?.note ?? '')
  const [units, setUnits] = useState<MeasurementUnit[]>(
    entry?.unit ? [entry.unit] : activity.unit ? [activity.unit] : [],
  )
  const [unitsError, setUnitsError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const fieldRefs = {
    amount: amountRef,
    date: dateRef,
    note: noteRef,
  }
  const fieldOrder = ['amount', 'date', 'unitId', 'note'] as const

  useEffect(() => {
    const controller = new AbortController()
    unitsService
      .list(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        const dimension = activity.unit?.dimension
        const compatible = list.filter(
          (unit) => dimension == null || unit.dimension === dimension,
        )
        setUnits((current) => {
          const merged = [...compatible]
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
    return () => controller.abort()
  }, [activity.unit])

  const unit = units.find((item) => item.id === unitId) ?? activity.unit

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    const parsedAmount = Number(amount.replace(',', '.'))

    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Informe uma quantidade maior que zero.'
    }
    if (!date) {
      nextErrors.date = 'Escolha uma data.'
    } else if (date > todayKey()) {
      nextErrors.date = 'Escolha uma data até hoje.'
    }
    if (unitId == null) {
      nextErrors.unitId = 'Escolha a unidade da quantidade.'
    }
    if (note.trim().length > 500) {
      nextErrors.note = 'Use no máximo 500 caracteres.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      focusFirstErroredField(nextErrors, fieldRefs, fieldOrder)
      return
    }

    setErrors({})
    setFormError(null)
    setSaving(true)

    const input: ProgressInput = {
      amount: parsedAmount,
      date,
      unitId: unitId as number,
      note: note.trim() || null,
    }

    try {
      if (entry) {
        await activitiesService.updateProgress(activity.id, entry.id, input)
      } else {
        await activitiesService.createProgress(activity.id, input)
      }
      onSaved()
    } catch (error) {
      const serverFields = fieldErrorsFrom(error)
      if (Object.keys(serverFields).length > 0) {
        setErrors(serverFields)
        focusFirstErroredField(serverFields, fieldRefs, fieldOrder)
      }
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-2">
          <Label htmlFor="progress-amount">Quantidade</Label>
          <div className="flex items-center gap-2">
            <Input
              id="progress-amount"
              ref={amountRef}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ex.: 1,5"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'progress-amount-error' : undefined}
              autoFocus
            />
            <span className="shrink-0 font-mono text-sm text-text-secondary">
              {unit?.symbol ?? ''}
            </span>
          </div>
          {errors.amount ? (
            <p id="progress-amount-error" role="alert" className="text-xs text-red">
              {errors.amount}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="progress-date">Data</Label>
          <Input
            id="progress-date"
            ref={dateRef}
            type="date"
            value={date}
            max={todayKey()}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date)}
          />
          {errors.date ? (
            <p role="alert" className="text-xs text-red">
              {errors.date}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="progress-unit">Unidade</Label>
        <Select
          value={unitId != null ? String(unitId) : undefined}
          onValueChange={(value) => setUnitId(Number(value))}
          disabled={saving}
        >
          <SelectTrigger id="progress-unit" aria-label="Unidade da quantidade">
            <SelectValue placeholder="Escolha a unidade" />
          </SelectTrigger>
          <SelectContent>
            {units.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name} ({item.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-text-secondary">
          Você pode usar qualquer unidade compatível com {activity.unit?.name ?? 'a atividade'}.
          O valor é convertido para {activity.unit?.symbol ?? 'a unidade do hábito'} nas
          estatísticas.
        </p>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="progress-note">Observação (opcional)</Label>
        <Textarea
          id="progress-note"
          ref={noteRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: treino leve, capítulo difícil…"
          maxLength={500}
          aria-invalid={Boolean(errors.note)}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.note ? (
            <p role="alert" className="text-xs text-red">
              {errors.note}
            </p>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] text-text-secondary">
            {note.length}/500
          </span>
        </div>
      </div>

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
            'Salvar registro'
          ) : (
            'Registrar quantidade'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ProgressEntryDialog({
  open,
  onOpenChange,
  activity,
  entry,
  defaultDate,
  onSaved,
}: ProgressEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar registro' : 'Registrar quantidade'}</DialogTitle>
          <DialogDescription>
            {activity.name}
            {activity.targetAmount != null
              ? ` · meta de ${activity.targetAmount} ${activity.unit?.symbol ?? ''} por ${
                  activity.frequency === 'daily'
                    ? 'dia'
                    : activity.frequency === 'weekly'
                      ? 'semana'
                      : 'mês'
                }`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <ProgressForm
          key={entry?.id ?? 'new'}
          activity={activity}
          entry={entry}
          defaultDate={defaultDate ?? todayKey()}
          onSaved={() => {
            onSaved()
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
