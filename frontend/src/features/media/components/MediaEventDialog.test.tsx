import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MediaEventDialog } from './MediaEventDialog'
import { mediaService } from '@/services/media'
import { todayKey } from '@/lib/dates'
import type { MediaItemSummary } from '@/features/media/types'

vi.mock('@/services/media', () => ({
  mediaService: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
  },
}))

const item: MediaItemSummary = {
  id: 7,
  title: 'Frieren',
  alternateTitle: null,
  description: null,
  releaseYear: 2023,
  creator: 'Kanehito Yamada',
  type: {
    id: 1,
    code: 'anime',
    name: 'Anime',
    defaultUnit: 'episode',
    unitLabel: 'episódios',
    units: ['episode', 'minute', 'hour'],
    isSystem: true,
  },
  genres: ['Fantasia'],
  totalUnits: 28,
  totalVolumes: null,
  averageDurationMinutes: 24,
  totalDurationMinutes: null,
  unitLabel: null,
  rating: 5,
  notes: null,
  status: 'in_progress',
  startedOn: null,
  finishedOn: null,
  archived: false,
  progressOverride: null,
  createdAt: '2026-10-21T12:00:00Z',
  updatedAt: '2026-10-21T12:00:00Z',
  consumed: [],
  progress: {
    unit: 'episode',
    label: 'episódios',
    consumed: 0,
    override: null,
    current: 0,
    total: 28,
    percent: 0,
  },
  time: {
    realMinutes: 0,
    estimatedMinutes: 0,
    unknownEvents: 0,
    totalKnownMinutes: 0,
  },
  eventCount: 0,
  repeatCount: 0,
  lastConsumedOn: null,
}

describe('MediaEventDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registra consumo com a unidade padrão e mostra a estimativa', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(mediaService.createEvent).mockResolvedValue({
      event: {} as never,
      item,
    })

    render(
      <MediaEventDialog
        open
        onOpenChange={vi.fn()}
        item={item}
        onSaved={onSaved}
      />,
    )

    await user.type(screen.getByLabelText('Quantidade'), '2')

    expect(screen.getByText(/estimado em 48 min/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Registrar consumo' }))

    await waitFor(() => {
      expect(mediaService.createEvent).toHaveBeenCalledWith(item.id, {
        date: todayKey(),
        amount: 2,
        unit: 'episode',
        durationMinutes: null,
        note: null,
        isRepeat: false,
      })
    })
    expect(onSaved).toHaveBeenCalledWith(item)
  })

  it('exige uma quantidade maior que zero', async () => {
    const user = userEvent.setup()

    render(
      <MediaEventDialog
        open
        onOpenChange={vi.fn()}
        item={item}
        onSaved={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Registrar consumo' }))

    expect(
      await screen.findByText('Informe uma quantidade maior que zero.'),
    ).toBeInTheDocument()
    expect(mediaService.createEvent).not.toHaveBeenCalled()
  })
})
