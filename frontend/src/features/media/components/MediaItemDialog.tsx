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
import {
  MEDIA_STATUS_LABELS,
  MEDIA_STATUS_ORDER,
  mediaUnitLabel,
} from '@/lib/media'
import type {
  MediaGenre,
  MediaItem,
  MediaItemInput,
  MediaItemSummary,
  MediaStatus,
  MediaType,
} from '@/features/media/types'
import { mediaService } from '@/services/media'

interface MediaItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: MediaItemSummary | MediaItem | null
  onSaved: (item: MediaItem) => void
  onTypeCreated?: () => void
}

type FieldKey =
  | 'typeId'
  | 'title'
  | 'alternateTitle'
  | 'description'
  | 'creator'
  | 'notes'
  | 'releaseYear'
  | 'totalUnits'
  | 'totalVolumes'
  | 'averageDurationMinutes'
  | 'totalDurationMinutes'
  | 'unitLabel'
  | 'rating'
  | 'status'
  | 'startedOn'
  | 'finishedOn'
  | 'progressOverride'
  | 'genres'

type FieldErrors = Partial<Record<FieldKey, string>>

const SERVER_FIELDS: FieldKey[] = [
  'typeId',
  'title',
  'alternateTitle',
  'description',
  'creator',
  'notes',
  'releaseYear',
  'totalUnits',
  'totalVolumes',
  'averageDurationMinutes',
  'totalDurationMinutes',
  'unitLabel',
  'rating',
  'status',
  'startedOn',
  'finishedOn',
  'progressOverride',
  'genres',
]

function serverFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {}
  const details = error.details
  if (!details || typeof details !== 'object' || !('fields' in details)) return {}
  const fields = (details as { fields?: unknown }).fields
  if (!fields || typeof fields !== 'object') return {}
  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(fields)) {
    if (SERVER_FIELDS.includes(key as FieldKey) && typeof value === 'string') {
      result[key as FieldKey] = value
    }
  }
  return result
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const number = Number(trimmed)
  return Number.isInteger(number) && number > 0 ? number : null
}

function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const number = Number(trimmed.replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : null
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseGenres(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const DURATION_UNITS = new Set(['episode', 'lesson', 'chapter', 'unit'])
const VOLUME_TYPES = new Set(['manga', 'comic'])
const MOVIE_UNITS = new Set(['movie', 'documentary'])

interface MediaItemFormProps {
  item?: MediaItemSummary | MediaItem | null
  types: MediaType[]
  genres: MediaGenre[]
  onTypesChange: (types: MediaType[]) => void
  onSaved: (item: MediaItem) => void
  onTypeCreated?: () => void
  onCancel: () => void
}

function MediaItemForm({
  item,
  types,
  genres,
  onTypesChange,
  onSaved,
  onTypeCreated,
  onCancel,
}: MediaItemFormProps) {
  const isEditing = Boolean(item)
  const [typeId, setTypeId] = useState<number | null>(item?.type.id ?? null)
  const [title, setTitle] = useState(item?.title ?? '')
  const [alternateTitle, setAlternateTitle] = useState(item?.alternateTitle ?? '')
  const [creator, setCreator] = useState(item?.creator ?? '')
  const [releaseYear, setReleaseYear] = useState(
    item?.releaseYear != null ? String(item.releaseYear) : '',
  )
  const [status, setStatus] = useState<MediaStatus>(item?.status ?? 'want')
  const [genresText, setGenresText] = useState(item?.genres.join(', ') ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [totalUnits, setTotalUnits] = useState(
    item?.totalUnits != null ? String(item.totalUnits) : '',
  )
  const [totalVolumes, setTotalVolumes] = useState(
    item?.totalVolumes != null ? String(item.totalVolumes) : '',
  )
  const [averageDuration, setAverageDuration] = useState(
    item?.averageDurationMinutes != null ? String(item.averageDurationMinutes) : '',
  )
  const [totalDuration, setTotalDuration] = useState(
    item?.totalDurationMinutes != null ? String(item.totalDurationMinutes) : '',
  )
  const [unitLabel, setUnitLabel] = useState(item?.unitLabel ?? '')
  const [rating, setRating] = useState(item?.rating != null ? String(item.rating) : 'none')
  const [startedOn, setStartedOn] = useState(item?.startedOn ?? '')
  const [finishedOn, setFinishedOn] = useState(item?.finishedOn ?? '')
  const [progressOverride, setProgressOverride] = useState(
    item?.progressOverride != null ? String(item.progressOverride) : '',
  )
  const [archived, setArchived] = useState(item?.archived ?? false)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customUnit, setCustomUnit] = useState('unit')
  const [customLabel, setCustomLabel] = useState('')
  const [creatingType, setCreatingType] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const typeRef = useRef<HTMLButtonElement>(null)

  const selectedType = types.find((type) => type.id === typeId) ?? null
  const showVolumes = selectedType ? VOLUME_TYPES.has(selectedType.code) : false
  const showAverageDuration = selectedType
    ? DURATION_UNITS.has(selectedType.defaultUnit)
    : false
  const showTotalDuration = selectedType
    ? MOVIE_UNITS.has(selectedType.defaultUnit)
    : false
  const showUnitLabel = selectedType?.defaultUnit === 'unit'

  async function handleCreateType() {
    if (!customName.trim()) {
      setErrors((current) => ({ ...current, typeId: 'Informe um nome para o tipo.' }))
      return
    }
    setCreatingType(true)
    setFormError(null)
    try {
      const created = await mediaService.createType({
        name: customName.trim(),
        defaultUnit: customUnit,
        unitLabel: customLabel.trim() || mediaUnitLabel(customUnit),
      })
      onTypesChange([...types, created])
      setTypeId(created.id)
      setCustomName('')
      setCustomLabel('')
      setCustomOpen(false)
      onTypeCreated?.()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível criar o tipo.',
      )
    } finally {
      setCreatingType(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const nextErrors: FieldErrors = {}

    if (typeId == null) nextErrors.typeId = 'Escolha um tipo de mídia.'
    if (!title.trim()) nextErrors.title = 'Informe o título.'
    else if (title.trim().length > 200) nextErrors.title = 'Use no máximo 200 caracteres.'

    const year = parseOptionalInt(releaseYear)
    if (releaseYear.trim() && (year == null || year > 3000)) {
      nextErrors.releaseYear = 'Use um ano válido.'
    }

    const parsedGenres = parseGenres(genresText)
    if (parsedGenres.length > 10) nextErrors.genres = 'Use no máximo 10 gêneros.'
    else if (parsedGenres.some((genre) => genre.length > 40)) {
      nextErrors.genres = 'Cada gênero deve ter no máximo 40 caracteres.'
    }

    for (const [value, key, label] of [
      [totalUnits, 'totalUnits', 'total de unidades'],
      [totalVolumes, 'totalVolumes', 'total de volumes'],
      [averageDuration, 'averageDurationMinutes', 'duração média'],
      [totalDuration, 'totalDurationMinutes', 'duração total'],
    ] as const) {
      if (value.trim() && parseOptionalInt(value) == null) {
        nextErrors[key] = `Informe um ${label} inteiro e positivo.`
      }
    }

    const parsedOverride = parseOptionalDecimal(progressOverride)
    if (progressOverride.trim() && parsedOverride == null) {
      nextErrors.progressOverride = 'Use um número maior ou igual a zero.'
    }
    const parsedTotalUnits = parseOptionalInt(totalUnits)
    if (
      parsedOverride != null &&
      parsedTotalUnits != null &&
      parsedOverride > parsedTotalUnits
    ) {
      nextErrors.progressOverride = 'O progresso não pode ultrapassar o total.'
    }

    if (startedOn && finishedOn && startedOn > finishedOn) {
      nextErrors.finishedOn = 'A conclusão deve ser posterior ao início.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      if (nextErrors.typeId) typeRef.current?.focus()
      else if (nextErrors.title) titleRef.current?.focus()
      return
    }

    setErrors({})
    setSaving(true)

    const input: MediaItemInput = {
      typeId: typeId as number,
      title: title.trim(),
      alternateTitle: optionalText(alternateTitle),
      description: optionalText(description),
      creator: optionalText(creator),
      genres: parsedGenres,
      totalUnits: parsedTotalUnits,
      totalVolumes: showVolumes ? parseOptionalInt(totalVolumes) : null,
      averageDurationMinutes: showAverageDuration ? parseOptionalInt(averageDuration) : null,
      totalDurationMinutes: showTotalDuration ? parseOptionalInt(totalDuration) : null,
      unitLabel: showUnitLabel ? optionalText(unitLabel) : null,
      rating: rating === 'none' ? null : Number(rating),
      notes: optionalText(notes),
      status,
      startedOn: startedOn || null,
      finishedOn: finishedOn || null,
      archived,
      progressOverride: parsedOverride,
    }

    try {
      const saved = item
        ? await mediaService.update(item.id, input)
        : await mediaService.create(input)
      onSaved(saved)
    } catch (error) {
      const serverFields = serverFieldErrors(error)
      if (Object.keys(serverFields).length > 0) setErrors(serverFields)
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar a mídia.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="media-type">Tipo</Label>
          <Select
            value={typeId != null ? String(typeId) : undefined}
            onValueChange={(value) => setTypeId(Number(value))}
            disabled={saving}
          >
            <SelectTrigger id="media-type" ref={typeRef} aria-label="Tipo de mídia">
              <SelectValue placeholder="Escolha o tipo" />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.typeId ? (
            <p role="alert" className="text-xs text-red">
              {errors.typeId}
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
            Tipo personalizado
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="media-status">Estado</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as MediaStatus)}
            disabled={saving}
          >
            <SelectTrigger id="media-status" aria-label="Estado da mídia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_STATUS_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {MEDIA_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {customOpen ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-text-secondary">
            Tipos personalizados usam as mesmas regras de consumo e estatísticas.
          </p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="custom-type-name">Nome</Label>
              <Input
                id="custom-type-name"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="Ex.: Audiolivro"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-type-unit">Unidade padrão</Label>
              <Select value={customUnit} onValueChange={setCustomUnit}>
                <SelectTrigger id="custom-type-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['unit', 'episode', 'page', 'chapter', 'movie', 'lesson', 'hour', 'minute'].map(
                    (unit) => (
                      <SelectItem key={unit} value={unit}>
                        {mediaUnitLabel(unit)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-type-label">Rótulo</Label>
              <Input
                id="custom-type-label"
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="Ex.: horas"
                maxLength={30}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={() => void handleCreateType()}
              disabled={creatingType}
            >
              {creatingType ? (
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
        <Label htmlFor="media-title">Título</Label>
        <Input
          id="media-title"
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Frieren"
          maxLength={200}
          autoFocus
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title ? (
          <p role="alert" className="text-xs text-red">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="media-alternate-title">Título alternativo (opcional)</Label>
          <Input
            id="media-alternate-title"
            value={alternateTitle}
            onChange={(event) => setAlternateTitle(event.target.value)}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-creator">Criador / autor (opcional)</Label>
          <Input
            id="media-creator"
            value={creator}
            onChange={(event) => setCreator(event.target.value)}
            placeholder="Ex.: Kanehito Yamada"
            maxLength={160}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="media-year">Ano (opcional)</Label>
          <Input
            id="media-year"
            inputMode="numeric"
            value={releaseYear}
            onChange={(event) => setReleaseYear(event.target.value)}
            placeholder="2023"
            aria-invalid={Boolean(errors.releaseYear)}
          />
          {errors.releaseYear ? (
            <p role="alert" className="text-xs text-red">
              {errors.releaseYear}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-rating">Nota (opcional)</Label>
          <Select value={rating} onValueChange={setRating} disabled={saving}>
            <SelectTrigger id="media-rating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem nota</SelectItem>
              {[1, 2, 3, 4, 5].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {'★'.repeat(value)}
                  {'☆'.repeat(5 - value)} · {value}/5
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-genres">Gêneros (opcional)</Label>
          <Input
            id="media-genres"
            value={genresText}
            onChange={(event) => setGenresText(event.target.value)}
            placeholder="Fantasia, Drama"
            list="media-genre-suggestions"
            aria-invalid={Boolean(errors.genres)}
          />
          <datalist id="media-genre-suggestions">
            {genres.map((genre) => (
              <option key={genre.id} value={genre.name} />
            ))}
          </datalist>
          {errors.genres ? (
            <p role="alert" className="text-xs text-red">
              {errors.genres}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="media-started">Início (opcional)</Label>
          <Input
            id="media-started"
            type="date"
            value={startedOn}
            max={todayKey()}
            onChange={(event) => setStartedOn(event.target.value)}
            aria-invalid={Boolean(errors.startedOn)}
          />
          {errors.startedOn ? (
            <p role="alert" className="text-xs text-red">
              {errors.startedOn}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-finished">Conclusão (opcional)</Label>
          <Input
            id="media-finished"
            type="date"
            value={finishedOn}
            max={todayKey()}
            onChange={(event) => setFinishedOn(event.target.value)}
            aria-invalid={Boolean(errors.finishedOn)}
          />
          {errors.finishedOn ? (
            <p role="alert" className="text-xs text-red">
              {errors.finishedOn}
            </p>
          ) : null}
        </div>
      </div>

      {selectedType ? (
        <fieldset className="space-y-4 rounded-lg border border-border bg-background p-3.5">
          <legend className="px-1 text-[11px] font-medium tracking-[0.1em] text-text-secondary uppercase">
            Progresso e duração
          </legend>
          <p className="text-xs text-text-secondary">
            A unidade padrão deste tipo é {mediaUnitLabel(selectedType.defaultUnit)}. O total
            e a duração média alimentam o progresso e as estimativas de tempo.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="media-total-units">
                Total de {mediaUnitLabel(selectedType.defaultUnit)} (opcional)
              </Label>
              <Input
                id="media-total-units"
                inputMode="numeric"
                value={totalUnits}
                onChange={(event) => setTotalUnits(event.target.value)}
                placeholder="Ex.: 28"
                aria-invalid={Boolean(errors.totalUnits)}
              />
              {errors.totalUnits ? (
                <p role="alert" className="text-xs text-red">
                  {errors.totalUnits}
                </p>
              ) : null}
            </div>

            {showVolumes ? (
              <div className="space-y-2">
                <Label htmlFor="media-total-volumes">Total de volumes (opcional)</Label>
                <Input
                  id="media-total-volumes"
                  inputMode="numeric"
                  value={totalVolumes}
                  onChange={(event) => setTotalVolumes(event.target.value)}
                  placeholder="Ex.: 12"
                  aria-invalid={Boolean(errors.totalVolumes)}
                />
                {errors.totalVolumes ? (
                  <p role="alert" className="text-xs text-red">
                    {errors.totalVolumes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showAverageDuration ? (
              <div className="space-y-2">
                <Label htmlFor="media-average-duration">
                  Duração média por unidade (min)
                </Label>
                <Input
                  id="media-average-duration"
                  inputMode="numeric"
                  value={averageDuration}
                  onChange={(event) => setAverageDuration(event.target.value)}
                  placeholder="Ex.: 24"
                  aria-invalid={Boolean(errors.averageDurationMinutes)}
                />
                {errors.averageDurationMinutes ? (
                  <p role="alert" className="text-xs text-red">
                    {errors.averageDurationMinutes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showTotalDuration ? (
              <div className="space-y-2">
                <Label htmlFor="media-total-duration">Duração total (min)</Label>
                <Input
                  id="media-total-duration"
                  inputMode="numeric"
                  value={totalDuration}
                  onChange={(event) => setTotalDuration(event.target.value)}
                  placeholder="Ex.: 120"
                  aria-invalid={Boolean(errors.totalDurationMinutes)}
                />
                {errors.totalDurationMinutes ? (
                  <p role="alert" className="text-xs text-red">
                    {errors.totalDurationMinutes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showUnitLabel ? (
              <div className="space-y-2">
                <Label htmlFor="media-unit-label">Rótulo da unidade</Label>
                <Input
                  id="media-unit-label"
                  value={unitLabel}
                  onChange={(event) => setUnitLabel(event.target.value)}
                  placeholder="Ex.: xícaras"
                  maxLength={30}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="media-progress-override">Progresso manual (opcional)</Label>
              <Input
                id="media-progress-override"
                inputMode="decimal"
                value={progressOverride}
                onChange={(event) => setProgressOverride(event.target.value)}
                placeholder="Ex.: 70"
                aria-invalid={Boolean(errors.progressOverride)}
              />
              {errors.progressOverride ? (
                <p role="alert" className="text-xs text-red">
                  {errors.progressOverride}
                </p>
              ) : null}
              <p className="text-[11px] text-text-secondary">
                Use quando quiser corrigir o progresso sem apagar registros. O consumo
                registrado continua visível.
              </p>
            </div>
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="media-description">Descrição (opcional)</Label>
        <Textarea
          id="media-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          placeholder="Sinopse curta ou por que você quer acompanhar esta obra."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="media-notes">Observações (opcional)</Label>
        <Textarea
          id="media-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          placeholder="Onde assistir, edição, detalhes pessoais…"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={archived}
          onChange={(event) => setArchived(event.target.checked)}
          className="size-4 rounded border-border bg-background accent-primary"
        />
        Arquivar este item (oculto da listagem padrão)
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
            'Salvar alterações'
          ) : (
            'Adicionar mídia'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface MediaItemDialogLoaderProps {
  item?: MediaItemSummary | MediaItem | null
  onSaved: (item: MediaItem) => void
  onTypeCreated?: () => void
  onCancel: () => void
}

function MediaItemDialogLoader({
  item,
  onSaved,
  onTypeCreated,
  onCancel,
}: MediaItemDialogLoaderProps) {
  const [types, setTypes] = useState<MediaType[]>([])
  const [genres, setGenres] = useState<MediaGenre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([mediaService.types(controller.signal), mediaService.genres(controller.signal)])
      .then(([typeList, genreList]) => {
        if (controller.signal.aborted) return
        setTypes(typeList)
        setGenres(genreList)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Falha ao carregar os tipos.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  if (loading) {
    return <p className="py-6 text-center text-sm text-text-secondary">Carregando tipos…</p>
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-xs text-red"
      >
        <Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <MediaItemForm
      key={item?.id ?? 'new'}
      item={item}
      types={types}
      genres={genres}
      onTypesChange={setTypes}
      onTypeCreated={onTypeCreated}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}

export function MediaItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  onTypeCreated,
}: MediaItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] max-w-2xl overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar mídia' : 'Nova mídia'}</DialogTitle>
          <DialogDescription>
            Registre a obra uma única vez e depois adicione consumos. Revisitas somam no
            consumo, mas não avançam o progresso da obra.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <MediaItemDialogLoader
            item={item}
            onTypeCreated={onTypeCreated}
            onSaved={(saved) => {
              onSaved(saved)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

