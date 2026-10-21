import type { ActivityColor } from '@/lib/colors'

export interface Activity {
  id: number
  name: string
  description: string | null
  category: string
  color: ActivityColor
  createdAt: string
  updatedAt: string
}

export interface ActivityInput {
  name: string
  description: string | null
  category: string
  color: ActivityColor
}

export interface ActivityWithStats extends Activity {
  stats: ActivityStats
  recentLogs: string[]
}

export interface ActivityLog {
  date: string
  createdAt: string
}

export interface ActivityStats {
  totalCompleted: number
  currentStreak: number
  longestStreak: number
  firstCompletedAt: string | null
  lastCompletedAt: string | null
}

export interface ActivityHistory {
  activity: Activity
  logs: ActivityLog[]
  stats: ActivityStats
  range: {
    start: string
    end: string
  }
}

export interface TodayEntry {
  activity: Activity
  completedToday: boolean
  currentStreak: number
  totalCompleted: number
  recentLogs: string[]
}

export interface TodaySummary {
  date: string
  activities: TodayEntry[]
}
