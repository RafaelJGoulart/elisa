import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { toDateKey } from '@/lib/dates'
import type { DiaryEntrySummary } from '@/features/diary/types'

export interface DiaryGroup {
  dateKey: string
  entries: DiaryEntrySummary[]
}

export function entryDateKey(isoValue: string): string {
  return toDateKey(parseISO(isoValue))
}

export function formatEntryTime(isoValue: string): string {
  return format(parseISO(isoValue), 'HH:mm', { locale: ptBR })
}

export function formatEntryDateTime(isoValue: string): string {
  return format(parseISO(isoValue), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}

export function isEdited(createdAt: string, updatedAt: string): boolean {
  return Date.parse(updatedAt) - Date.parse(createdAt) > 1000
}

export function parseTagsInput(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of value.split(',')) {
    const tag = part.trim()
    if (!tag) continue
    const key = tag.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  return tags
}

export function groupEntriesByDate(entries: DiaryEntrySummary[]): DiaryGroup[] {
  const groups = new Map<string, DiaryEntrySummary[]>()

  for (const entry of entries) {
    const key = entryDateKey(entry.createdAt)
    const current = groups.get(key)
    if (current) {
      current.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }

  return Array.from(groups, ([dateKey, groupEntries]) => ({
    dateKey,
    entries: groupEntries,
  }))
}
