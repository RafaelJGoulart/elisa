import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import type {
  Activity,
  ActivityHistory,
  ActivityInput,
  ActivityLog,
  ActivityStats,
  ActivityWithStats,
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

export const activitiesService = {
  async list(signal?: AbortSignal): Promise<ActivityWithStats[]> {
    const response = await api.get<ActivityListResponse>('/activities', signal)
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

  async update(id: number, input: ActivityInput): Promise<Activity> {
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

  async today(signal?: AbortSignal): Promise<TodaySummary> {
    return api.get<TodaySummary>('/today', signal)
  },
}

export { getErrorMessage }
