import { describe, expect, it } from 'vitest'

import { formatMonthLabel, mediaUnitLabel, statusBadgeVariant } from './media'
import type { MediaType } from '@/features/media/types'

const type: MediaType = {
  id: 1,
  code: 'anime',
  name: 'Anime',
  defaultUnit: 'episode',
  unitLabel: 'episódios',
  units: ['episode', 'minute', 'hour'],
  isSystem: true,
}

describe('media helpers', () => {
  it('formata meses no padrão pt-BR', () => {
    expect(formatMonthLabel('2026-10')).toBe('outubro de 2026')
  })

  it('traduz unidades conhecidas e preserva desconhecidas', () => {
    expect(mediaUnitLabel('page')).toBe('páginas')
    expect(mediaUnitLabel('xícara')).toBe('xícara')
  })

  it('associa estados a variantes visuais distintas', () => {
    expect(statusBadgeVariant('completed')).toBe('success')
    expect(statusBadgeVariant('dropped')).toBe('danger')
    expect(statusBadgeVariant('in_progress')).toBe('default')
  })

  it('expõe as unidades aceitas pelo tipo', () => {
    expect(type.units).toContain('episode')
    expect(type.units).not.toContain('page')
  })
})
