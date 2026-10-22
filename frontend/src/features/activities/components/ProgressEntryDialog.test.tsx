import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProgressEntryDialog } from './ProgressEntryDialog'
import { activitiesService, unitsService } from '@/services/activities'
import { todayKey } from '@/lib/dates'
import type { Activity, MeasurementUnit } from '@/features/activities/types'

vi.mock('@/services/activities', () => ({
  activitiesService: {
    createProgress: vi.fn(),
    updateProgress: vi.fn(),
  },
  unitsService: {
    list: vi.fn().mockResolvedValue([]),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Erro inesperado',
}))

const milliliter: MeasurementUnit = {
  id: 10,
  code: 'milliliter',
  name: 'Mililitro',
  symbol: 'ml',
  category: 'Volume',
  dimension: 'volume',
  isSystem: true,
}

const liter: MeasurementUnit = {
  id: 11,
  code: 'liter',
  name: 'Litro',
  symbol: 'L',
  category: 'Volume',
  dimension: 'volume',
  isSystem: true,
}

const activity: Activity = {
  id: 3,
  name: 'Beber água',
  description: null,
  category: 'Saúde',
  color: 'blue',
  kind: 'measurable',
  frequency: 'daily',
  unit: milliliter,
  targetAmount: 2000,
  archived: false,
  createdAt: '2026-10-21T12:00:00Z',
  updatedAt: '2026-10-21T12:00:00Z',
}

describe('ProgressEntryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(unitsService.list).mockResolvedValue([milliliter, liter])
  })

  it('registra a quantidade na unidade do hábito', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(activitiesService.createProgress).mockResolvedValue({
      entry: {} as never,
      stats: {} as never,
    })

    render(
      <ProgressEntryDialog
        open
        onOpenChange={vi.fn()}
        activity={activity}
        onSaved={onSaved}
      />,
    )

    await user.type(screen.getByLabelText('Quantidade'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar quantidade' }))

    await waitFor(() => {
      expect(activitiesService.createProgress).toHaveBeenCalledWith(activity.id, {
        amount: 500,
        date: todayKey(),
        unitId: milliliter.id,
        note: null,
      })
    })
    expect(onSaved).toHaveBeenCalled()
  })
})
