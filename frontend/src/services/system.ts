import { api } from '@/lib/api'

export interface HealthStatus {
  status: string
  version: string
  database: string
}

export const systemService = {
  health(signal?: AbortSignal): Promise<HealthStatus> {
    return api.get<HealthStatus>('/health', signal)
  },
}
