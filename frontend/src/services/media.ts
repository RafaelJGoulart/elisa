import { api } from '@/lib/api'
import type {
  MediaEvent,
  MediaEventFeed,
  MediaEventInput,
  MediaGenre,
  MediaItemDetail,
  MediaItemInput,
  MediaItemSummary,
  MediaListFilters,
  MediaListResult,
  MediaStats,
  MediaType,
} from '@/features/media/types'

interface ItemResponse {
  item: MediaItemDetail
}

interface EventResponse {
  event: MediaEvent
  item: MediaItemSummary
}

interface TypesResponse {
  types: MediaType[]
}

interface TypeResponse {
  type: MediaType
}

interface GenresResponse {
  genres: MediaGenre[]
}

interface StatsResponse {
  stats: MediaStats
}

function buildQuery(values: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const mediaService = {
  async types(signal?: AbortSignal): Promise<MediaType[]> {
    const response = await api.get<TypesResponse>('/media/types', signal)
    return response.types
  },

  async createType(input: {
    name: string
    defaultUnit: string
    unitLabel: string
  }): Promise<MediaType> {
    const response = await api.post<TypeResponse>('/media/types', input)
    return response.type
  },

  async genres(signal?: AbortSignal): Promise<MediaGenre[]> {
    const response = await api.get<GenresResponse>('/media/genres', signal)
    return response.genres
  },

  async list(filters: MediaListFilters = {}, signal?: AbortSignal): Promise<MediaListResult> {
    const query = buildQuery({
      query: filters.query,
      type: filters.type,
      status: filters.status,
      genre: filters.genre,
      sort: filters.sort,
      limit: filters.limit,
      offset: filters.offset,
      includeArchived: filters.includeArchived,
    })
    return api.get<MediaListResult>(`/media/items${query}`, signal)
  },

  async get(id: number, signal?: AbortSignal): Promise<MediaItemDetail> {
    const response = await api.get<ItemResponse>(`/media/items/${id}`, signal)
    return response.item
  },

  async create(input: MediaItemInput): Promise<MediaItemDetail> {
    const response = await api.post<ItemResponse>('/media/items', input)
    return response.item
  },

  async update(id: number, input: Partial<MediaItemInput>): Promise<MediaItemDetail> {
    const response = await api.patch<ItemResponse>(`/media/items/${id}`, input)
    return response.item
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/media/items/${id}`)
  },

  async createEvent(itemId: number, input: MediaEventInput): Promise<EventResponse> {
    return api.post<EventResponse>(`/media/items/${itemId}/events`, input)
  },

  async updateEvent(eventId: number, input: Partial<MediaEventInput>): Promise<EventResponse> {
    return api.patch<EventResponse>(`/media/events/${eventId}`, input)
  },

  async removeEvent(eventId: number): Promise<void> {
    await api.delete(`/media/events/${eventId}`)
  },

  async listEvents(
    filters: {
      start?: string
      end?: string
      type?: string
      genre?: string
      limit?: number
      offset?: number
    } = {},
    signal?: AbortSignal,
  ): Promise<MediaEventFeed> {
    const query = buildQuery({
      start: filters.start,
      end: filters.end,
      type: filters.type,
      genre: filters.genre,
      limit: filters.limit,
      offset: filters.offset,
    })
    return api.get<MediaEventFeed>(`/media/events${query}`, signal)
  },

  async stats(
    filters: { start?: string; end?: string; type?: string; genre?: string } = {},
    signal?: AbortSignal,
  ): Promise<MediaStats> {
    const query = buildQuery({
      start: filters.start,
      end: filters.end,
      type: filters.type,
      genre: filters.genre,
    })
    const response = await api.get<StatsResponse>(`/media/stats${query}`, signal)
    return response.stats
  },
}
