export interface XpEvent {
  id: number
  source: string
  category: string
  categoryLabel: string
  kind: 'occurrence' | 'weekly_bonus'
  reason: 'grant' | 'correction'
  description: string
  amount: number
  activityDate: string
  recordedAt: string
}

export interface XpCategory {
  key: string
  label: string
  xp: number
}

export interface ProfileStats {
  habitOccurrences: number
  habitWeeks: number
  habitXp: number
}

export interface UserProfile {
  level: number
  totalXp: number
  currentLevelTotalXp: number
  nextLevelTotalXp: number
  xpIntoLevel: number
  xpToNextLevel: number
  xpForNextLevel: number
  progressPercent: number
  stats: ProfileStats
  categories: XpCategory[]
  recentEvents: XpEvent[]
}

export interface ProfileResponse {
  profile: UserProfile
}
