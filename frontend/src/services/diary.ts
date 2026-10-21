import { api } from '@/lib/api'
import type {
  DiaryEntry,
  DiaryInput,
  DiaryListResponse,
  DiaryReindexResult,
  DiaryUpdateInput,
} from '@/features/diary/types'

interface DiaryEntryResponse {
  entry: DiaryEntry
}

interface DiaryListOptions {
  query?: string
  month?: string
  start?: string
  end?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}

export const diaryService = {
  async list(options: DiaryListOptions = {}): Promise<DiaryListResponse> {
    const params = new URLSearchParams()
    if (options.query) params.set('query', options.query)
    if (options.month) params.set('month', options.month)
    if (options.start) params.set('start', options.start)
    if (options.end) params.set('end', options.end)
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    if (options.offset !== undefined) params.set('offset', String(options.offset))

    const query = params.toString()
    return api.get<DiaryListResponse>(`/diary${query ? `?${query}` : ''}`, options.signal)
  },

  async get(id: string, signal?: AbortSignal): Promise<DiaryEntry> {
    const response = await api.get<DiaryEntryResponse>(`/diary/${id}`, signal)
    return response.entry
  },

  async create(input: DiaryInput): Promise<DiaryEntry> {
    const response = await api.post<DiaryEntryResponse>('/diary', input)
    return response.entry
  },

  async update(id: string, input: DiaryUpdateInput): Promise<DiaryEntry> {
    const response = await api.patch<DiaryEntryResponse>(`/diary/${id}`, input)
    return response.entry
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/diary/${id}`)
  },

  async reindex(): Promise<DiaryReindexResult> {
    return api.post<DiaryReindexResult>('/diary/reindex', {})
  },
}
