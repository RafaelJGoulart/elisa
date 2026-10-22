export type MediaStatus = 'want' | 'in_progress' | 'completed' | 'paused' | 'dropped'
export type MediaSort = 'recent' | 'title' | 'created' | 'rating' | 'year'
export type MediaTimeKind = 'real' | 'estimated' | 'unknown'

export interface MediaType {
  id: number
  code: string
  name: string
  defaultUnit: string
  unitLabel: string
  units: string[]
  isSystem: boolean
}

export interface MediaGenre {
  id: number
  name: string
}

export interface MediaQuantity {
  unit: string
  label: string
  amount: number
}

export interface MediaProgress {
  unit: string
  label: string
  /** Consumo que avança o progresso (ignora revisitas e unidades diferentes). */
  consumed: number
  /** Progresso manual informado pelo usuário, quando existir. */
  override: number | null
  /** Valor usado no progresso: override ou consumed. */
  current: number
  total: number | null
  percent: number | null
}

export interface MediaTimeSummary {
  realMinutes: number
  estimatedMinutes: number
  unknownEvents: number
  totalKnownMinutes: number
}

export interface MediaEvent {
  id: number
  mediaItemId: number
  date: string
  amount: number
  unit: string
  unitLabel: string
  durationMinutes: number | null
  estimatedMinutes: number | null
  knownMinutes: number | null
  timeKind: MediaTimeKind
  note: string | null
  isRepeat: boolean
  createdAt: string
  updatedAt: string
  item?: {
    id: number
    title: string
    type: MediaType
  }
}

export interface MediaItem {
  id: number
  title: string
  alternateTitle: string | null
  description: string | null
  releaseYear: number | null
  creator: string | null
  type: MediaType
  genres: string[]
  totalUnits: number | null
  totalVolumes: number | null
  averageDurationMinutes: number | null
  totalDurationMinutes: number | null
  unitLabel: string | null
  rating: number | null
  notes: string | null
  status: MediaStatus
  startedOn: string | null
  finishedOn: string | null
  archived: boolean
  progressOverride: number | null
  createdAt: string
  updatedAt: string
}

export interface MediaAggregates {
  consumed: MediaQuantity[]
  progress: MediaProgress
  time: MediaTimeSummary
  eventCount: number
  repeatCount: number
  lastConsumedOn: string | null
}

export type MediaItemSummary = MediaItem & MediaAggregates

export type MediaItemDetail = MediaItemSummary & {
  events: MediaEvent[]
}

export interface MediaItemInput {
  typeId: number
  title: string
  alternateTitle: string | null
  description: string | null
  creator: string | null
  genres: string[]
  totalUnits: number | null
  totalVolumes: number | null
  averageDurationMinutes: number | null
  totalDurationMinutes: number | null
  unitLabel: string | null
  rating: number | null
  notes: string | null
  status: MediaStatus
  startedOn: string | null
  finishedOn: string | null
  archived: boolean
  progressOverride: number | null
}

export interface MediaEventInput {
  date: string
  amount: number
  unit: string
  durationMinutes: number | null
  note: string | null
  isRepeat: boolean
}

export interface MediaListFilters {
  query?: string
  type?: string
  status?: MediaStatus | ''
  genre?: string
  sort?: MediaSort
  limit?: number
  offset?: number
  includeArchived?: boolean
}

export interface MediaListResult {
  items: MediaItemSummary[]
  total: number
  limit: number
  offset: number
}

export interface MediaEventFeed {
  events: MediaEvent[]
  total: number
}

export interface MediaStats {
  filters: {
    start: string
    end: string
    type: string | null
    genre: string | null
  }
  totals: {
    items: number
    completed: number
    inProgress: number
    paused: number
    dropped: number
    want: number
    archived: number
    events: number
  }
  quantities: MediaQuantity[]
  time: MediaTimeSummary
  byType: Array<{
    type: string
    code: string
    count: number
    completed: number
  }>
  byGenre: Array<{ name: string; count: number }>
  months: Array<{
    month: string
    eventCount: number
    quantities: MediaQuantity[]
    realMinutes: number
    estimatedMinutes: number
    unknownEvents: number
  }>
  recentEvents: MediaEvent[]
}
