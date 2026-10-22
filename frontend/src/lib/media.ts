import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import type { MediaStatus, MediaType } from '@/features/media/types'

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  want: 'Quero conhecer',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  paused: 'Pausado',
  dropped: 'Abandonado',
}

export const MEDIA_STATUS_ORDER: MediaStatus[] = [
  'want',
  'in_progress',
  'completed',
  'paused',
  'dropped',
]

export const MEDIA_SORT_LABELS = {
  recent: 'Atividade recente',
  title: 'Título (A–Z)',
  created: 'Adicionados recentemente',
  rating: 'Melhor avaliados',
  year: 'Ano de lançamento',
} as const

export const UNIT_LABELS: Record<string, string> = {
  episode: 'episódios',
  page: 'páginas',
  chapter: 'capítulos',
  volume: 'volumes',
  movie: 'filmes',
  documentary: 'documentários',
  lesson: 'aulas',
  hour: 'horas',
  minute: 'minutos',
  unit: 'unidades',
}

const TYPE_ICONS: Record<string, string> = {
  anime: 'tv',
  series: 'tv',
  movie: 'film',
  book: 'book-open',
  light_novel: 'book-open',
  manga: 'book',
  comic: 'book',
  game: 'play-circle',
  documentary: 'video',
  course: 'award',
  podcast: 'mic',
  other: 'layers',
}

export function statusBadgeVariant(
  status: MediaStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' {
  switch (status) {
    case 'in_progress':
      return 'default'
    case 'completed':
      return 'success'
    case 'paused':
      return 'warning'
    case 'dropped':
      return 'danger'
    case 'want':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function mediaTypeIcon(type: Pick<MediaType, 'code'>): string {
  return TYPE_ICONS[type.code] ?? 'layers'
}

export function mediaUnitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit
}

export function unitOptions(type: MediaType): Array<{ value: string; label: string }> {
  return type.units.map((unit) => ({
    value: unit,
    label: mediaUnitLabel(unit),
  }))
}

/** Formata "2026-10" como "outubro de 2026". */
export function formatMonthLabel(month: string): string {
  try {
    return format(parse(month, 'yyyy-MM', new Date()), "MMMM 'de' yyyy", {
      locale: ptBR,
    })
  } catch {
    return month
  }
}

/** Rótulo da unidade de progresso (o backend já envia o rótulo plural). */
export function progressLabel(type: MediaType): string {
  return type.unitLabel
}
