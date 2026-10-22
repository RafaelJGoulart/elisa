import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import type {
  Activity,
  ActivityHistory,
  ActivityInput,
  ActivityLog,
  ActivityProgressEntry,
  ActivityStats,
  ActivityWithStats,
  MeasurementUnit,
  ProgressInput,
  TodaySummary,
} from '@/features/activities/types'

interface ActivityResponse {
  activity: Activity
}

interface ActivityListResponse {
  activities: ActivityWithStats[]
}

interface LogResponse {
  log: ActivityLog
  stats: ActivityStats
}

interface ProgressResponse {
  entry: ActivityProgressEntry
  stats: ActivityStats
}

interface UnitsResponse {
  units: MeasurementUnit[]
}

interface UnitResponse {
  unit: MeasurementUnit
}

export const activitiesService = {
  async list(signal?: AbortSignal, includeArchived = false): Promise<ActivityWithStats[]> {
    const query = includeArchived ? '?includeArchived=true' : ''
    const response = await api.get<ActivityListResponse>(`/activities${query}`, signal)
    return response.activities
  },

  async get(id: number, signal?: AbortSignal): Promise<Activity> {
    const response = await api.get<ActivityResponse>(`/activities/${id}`, signal)
    return response.activity
  },

  async create(input: ActivityInput): Promise<Activity> {
    const response = await api.post<ActivityResponse>('/activities', input)
    return response.activity
  },

  async update(id: number, input: Partial<ActivityInput>): Promise<Activity> {
    const response = await api.patch<ActivityResponse>(`/activities/${id}`, input)
    return response.activity
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/activities/${id}`)
  },

  async history(
    id: number,
    range: { start: string; end: string },
    signal?: AbortSignal,
  ): Promise<ActivityHistory> {
    const query = new URLSearchParams({ start: range.start, end: range.end })
    return api.get<ActivityHistory>(`/activities/${id}/history?${query.toString()}`, signal)
  },

  async toggleLog(id: number, date: string, completed: boolean): Promise<LogResponse | void> {
    if (completed) {
      return api.post<LogResponse>(`/activities/${id}/logs`, { date })
    }
    await api.delete(`/activities/${id}/logs/${date}`)
  },

  async createProgress(id: number, input: ProgressInput): Promise<ProgressResponse> {
    return api.post<ProgressResponse>(`/activities/${id}/progress`, input)
  },

  async updateProgress(
    id: number,
    entryId: number,
    input: Partial<ProgressInput>,
  ): Promise<ProgressResponse> {
    return api.patch<ProgressResponse>(`/activities/${id}/progress/${entryId}`, input)
  },

  async removeProgress(id: number, entryId: number): Promise<void> {
    await api.delete(`/activities/${id}/progress/${entryId}`)
  },

  async today(signal?: AbortSignal): Promise<TodaySummary> {
    return api.get<TodaySummary>('/today', signal)
  },
}

export const unitsService = {
  async list(signal?: AbortSignal): Promise<MeasurementUnit[]> {
    const response = await api.get<UnitsResponse>('/units', signal)
    return response.units
  },

  async create(input: { name: string; symbol: string }): Promise<MeasurementUnit> {
    const response = await api.post<UnitResponse>('/units', input)
    return response.unit
  },
}

export { getErrorMessage }
