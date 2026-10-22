import { useRef, useState, type FormEvent } from 'react'

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
import { formatMinutes } from '@/lib/format'
import { mediaUnitLabel } from '@/lib/media'
import type {
  MediaEvent,
  MediaEventInput,
  MediaItem,
  MediaItemSummary,
} from '@/features/media/types'
import { mediaService } from '@/services/media'

interface MediaEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MediaItemSummary | MediaItem
  event?: MediaEvent | null
  onSaved: (item: MediaItemSummary) => void
}

type EventField = 'date' | 'amount' | 'unit' | 'durationMinutes' | 'note' | 'isRepeat'

function serverFieldErrors(error: unknown): Partial<Record<EventField, string>> {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  if (!details || typeof details !== 'object' || !('fields' in details)) return {}
  const fields = (details as { fields?: unknown }).fields
  if (!fields || typeof fields !== 'object') return {}
  const result: Partial<Record<EventField, string>> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (
      ['date', 'amount', 'unit', 'durationMinutes', 'note', 'isRepeat'].includes(key) &&
      typeof value === 'string'
    ) {
      result[key as EventField] = value
    }
  }
  return result
}

interface EventFormProps {
  item: MediaItemSummary | MediaItem
  event?: MediaEvent | null
  onSaved: (item: MediaItemSummary) => void
  onCancel: () => void
}

function EventForm({ item, event, onSaved, onCancel }: EventFormProps) {
  const isEditing = Boolean(event)
  const [date, setDate] = useState(event?.date ?? todayKey())
  const [amount, setAmount] = useState(event ? String(event.amount) : '')
  const [unit, setUnit] = useState(event?.unit ?? item.type.defaultUnit)
  const [duration, setDuration] = useState(
    event?.durationMinutes != null ? String(event.durationMinutes) : '',
  )
  const [note, setNote] = useState(event?.note ?? '')
  const [isRepeat, setIsRepeat] = useState(event?.isRepeat ?? false)
  const [errors, setErrors] = useState<Partial<Record<EventField, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const timeUnit = unit === 'minute' || unit === 'hour'
  const parsedAmount = Number(amount.replace(',', '.'))
  const parsedDuration = duration.trim() ? Number(duration.replace(',', '.')) : null
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0

  let estimatedMinutes: number | null = null
  if (!timeUnit && !parsedDuration && amountValid) {
    if (
      item.averageDurationMinutes != null &&
      ['episode', 'lesson', 'chapter', 'unit'].includes(unit)
    ) {
      estimatedMinutes = parsedAmount * item.averageDurationMinutes
    } else if (
      item.totalDurationMinutes != null &&
      ['movie', 'documentary'].includes(unit)
    ) {
      estimatedMinutes = parsedAmount * item.totalDurationMinutes
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const nextErrors: Partial<Record<EventField, string>> = {}

    if (!date) nextErrors.date = 'Escolha a data.'
    else if (date > todayKey()) nextErrors.date = 'Escolha uma data até hoje.'

    if (!amount.trim() || !amountValid) {
      nextErrors.amount = 'Informe uma quantidade maior que zero.'
    }
    if (!unit) nextErrors.unit = 'Escolha a unidade.'
    if (duration.trim() && (!Number.isFinite(parsedDuration) || (parsedDuration ?? 0) <= 0)) {
      nextErrors.durationMinutes = 'Informe uma duração maior que zero.'
    }
    if (note.trim().length > 500) nextErrors.note = 'Use no máximo 500 caracteres.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      if (nextErrors.amount) amountRef.current?.focus()
      else if (nextErrors.date) dateRef.current?.focus()
      return
    }

    setErrors({})
    setFormError(null)
    setSaving(true)

    const input: MediaEventInput = {
      date,
      amount: parsedAmount,
      unit,
      durationMinutes: timeUnit ? null : parsedDuration,
      note: note.trim() || null,
      isRepeat,
    }

    try {
      const response = event
        ? await mediaService.updateEvent(event.id, input)
        : await mediaService.createEvent(item.id, input)
      onSaved(response.item)
    } catch (error) {
      const fields = serverFieldErrors(error)
      if (Object.keys(fields).length > 0) setErrors(fields)
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar o consumo.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_140px]">
        <div className="space-y-2">
          <Label htmlFor="event-amount">Quantidade</Label>
          <Input
            id="event-amount"
            ref={amountRef}
            inputMode="decimal"
            value={amount}
            onChange={(event_) => setAmount(event_.target.value)}
            placeholder="Ex.: 2"
            autoFocus
            aria-invalid={Boolean(errors.amount)}
          />
          {errors.amount ? (
            <p role="alert" className="text-xs text-red">
              {errors.amount}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-unit">Unidade</Label>
          <Select
            value={unit}
            onValueChange={(value) => {
              setUnit(value)
              if (value === 'minute' || value === 'hour') setDuration('')
            }}
            disabled={saving}
          >
            <SelectTrigger id="event-unit" aria-label="Unidade do consumo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.type.units.map((value) => (
                <SelectItem key={value} value={value}>
                  {mediaUnitLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit ? (
            <p role="alert" className="text-xs text-red">
              {errors.unit}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-date">Data</Label>
          <Input
            id="event-date"
            ref={dateRef}
            type="date"
            value={date}
            max={todayKey()}
            onChange={(event_) => setDate(event_.target.value)}
            aria-invalid={Boolean(errors.date)}
          />
          {errors.date ? (
            <p role="alert" className="text-xs text-red">
              {errors.date}
            </p>
          ) : null}
        </div>
      </div>

      {!timeUnit ? (
        <div className="space-y-2">
          <Label htmlFor="event-duration">Duração real em minutos (opcional)</Label>
          <Input
            id="event-duration"
            inputMode="decimal"
            value={duration}
            onChange={(event_) => setDuration(event_.target.value)}
            placeholder="Ex.: 45"
            aria-invalid={Boolean(errors.durationMinutes)}
          />
          {errors.durationMinutes ? (
            <p role="alert" className="text-xs text-red">
              {errors.durationMinutes}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="rounded-md border border-border bg-background px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
        {timeUnit
          ? `O tempo será tratado como real: ${formatMinutes(
              unit === 'hour' ? (amountValid ? parsedAmount * 60 : 0) : amountValid ? parsedAmount : 0,
            )}.`
          : parsedDuration && parsedDuration > 0
            ? `Tempo real informado: ${formatMinutes(parsedDuration)}.`
            : estimatedMinutes != null
              ? `Sem duração informada, o tempo será estimado em ${formatMinutes(
                  estimatedMinutes,
                )} com base na duração média do item.`
              : 'Sem duração conhecida, este registro ficará com tempo não informado. Não inventamos estimativas.'}
      </p>

      <div className="space-y-2">
        <Label htmlFor="event-note">Observação (opcional)</Label>
        <Textarea
          id="event-note"
          value={note}
          onChange={(event_) => setNote(event_.target.value)}
          maxLength={500}
          placeholder="Ex.: maratona no fim de semana, capítulo favorito…"
        />
        {errors.note ? (
          <p role="alert" className="text-xs text-red">
            {errors.note}
          </p>
        ) : null}
      </div>

      <label className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={isRepeat}
          onChange={(event_) => setIsRepeat(event_.target.checked)}
          className="mt-0.5 size-4 rounded border-border bg-background accent-primary"
        />
        <span>
          <span className="font-medium text-foreground">Revisita / replay.</span> Soma no
          consumo total, mas não avança o progresso da obra nem conta a conclusão de novo.
        </span>
      </label>

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
            'Salvar consumo'
          ) : (
            'Registrar consumo'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function MediaEventDialog({
  open,
  onOpenChange,
  item,
  event,
  onSaved,
}: MediaEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar consumo' : 'Registrar consumo'}</DialogTitle>
          <DialogDescription>
            {item.title} · {item.type.name}
          </DialogDescription>
        </DialogHeader>

        <EventForm
          key={event?.id ?? 'new'}
          item={item}
          event={event}
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
