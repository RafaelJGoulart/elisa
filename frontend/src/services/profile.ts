import { api } from '@/lib/api'
import type { ProfileResponse, UserProfile } from '@/features/profile/types'

export const profileService = {
  async get(signal?: AbortSignal): Promise<UserProfile> {
    const response = await api.get<ProfileResponse>('/profile', signal)
    return response.profile
  },
}
