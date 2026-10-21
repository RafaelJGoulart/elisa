export interface DiaryEntrySummary {
  id: string
  title: string
  tags: string[]
  createdAt: string
  updatedAt: string
  excerpt: string
}

export interface DiaryEntry {
  id: string
  title: string
  tags: string[]
  content: string
  createdAt: string
  updatedAt: string
}

export interface DiaryInput {
  title?: string
  content: string
  tags?: string[]
}

export interface DiaryUpdateInput {
  title?: string
  content?: string
  tags?: string[]
}

export interface DiaryListResponse {
  entries: DiaryEntrySummary[]
  hasMore: boolean
  limit: number
  offset: number
}

export interface DiaryListFilters {
  query: string
  month: string | null
}

export interface DiaryReindexResult {
  indexed: number
  skipped: number
  errors: Array<{ file: string; message: string }>
}
