import type { ActivityColor } from '@/lib/colors'

export type ActivityKind = 'binary' | 'measurable'
export type ActivityFrequency = 'daily' | 'weekly' | 'monthly'

export interface MeasurementUnit {
  id: number
  code: string
  name: string
  symbol: string
  category: string
  dimension: string
  isSystem: boolean
}

export interface Activity {
  id: number
  name: string
  description: string | null
  category: string
  color: ActivityColor
  kind: ActivityKind
  frequency: ActivityFrequency
  unit: MeasurementUnit | null
  targetAmount: number | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ActivityInput {
  name: string
  description: string | null
  category: string
  color: ActivityColor
  kind: ActivityKind
  frequency: ActivityFrequency
  unitId: number | null
  targetAmount: number | null
}

export interface ActivityWithStats extends Activity {
  stats: ActivityStats
  recentLogs: string[]
}

export interface ActivityLog {
  date: string
  createdAt: string
}

export interface DailyProgress {
  date: string
  amount: number
  entries: number
  goalMet: boolean
}

export interface ActivityStats {
  totalCompleted: number
  currentStreak: number
  longestStreak: number
  firstCompletedAt: string | null
  lastCompletedAt: string | null
  totalAmount?: number
  todayAmount?: number
  currentPeriodStart?: string
  currentPeriodEnd?: string
  currentPeriodAmount?: number
  currentPeriodPercent?: number | null
  currentPeriodMet?: boolean
  weekAmount?: number
  monthAmount?: number
  averagePerRecordedDay?: number
  recordedDays?: number
  entriesCount?: number
  periodsMet?: number
  daily?: DailyProgress[]
}

export interface ActivityProgressEntry {
  id: number
  activityId: number
  date: string
  amount: number
  unit: MeasurementUnit
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ProgressInput {
  date: string
  amount: number
  unitId: number
  note: string | null
}

export interface ActivityHistory {
  activity: Activity
  logs: ActivityLog[]
  progressEntries: ActivityProgressEntry[]
  completedDates: string[]
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
  stats: ActivityStats
}

export interface TodaySummary {
  date: string
  activities: TodayEntry[]
}
