import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActivityFormDialog } from './ActivityFormDialog'
import { activitiesService } from '@/services/activities'
import type { Activity } from '@/features/activities/types'

vi.mock('@/services/activities', () => ({
  activitiesService: {
    create: vi.fn(),
    update: vi.fn(),
  },
  unitsService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Erro inesperado',
}))

const savedActivity: Activity = {
  id: 1,
  name: 'Corrida',
  description: null,
  category: 'Saúde',
  color: 'green',
  kind: 'binary',
  frequency: 'daily',
  unit: null,
  targetAmount: null,
  archived: false,
  createdAt: '2026-10-21T12:00:00Z',
  updatedAt: '2026-10-21T12:00:00Z',
}

describe('ActivityFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia os dados válidos e informa o salvamento', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(activitiesService.create).mockResolvedValue(savedActivity)

    render(
      <ActivityFormDialog open onOpenChange={vi.fn()} onSaved={onSaved} />,
    )

    await user.type(screen.getByLabelText('Nome'), 'Corrida')
    await user.type(screen.getByLabelText('Categoria'), 'Saúde')
    await user.click(screen.getByRole('radio', { name: 'Verde' }))
    await user.click(screen.getByRole('button', { name: 'Criar atividade' }))

    await waitFor(() => {
      expect(activitiesService.create).toHaveBeenCalledWith({
        name: 'Corrida',
        description: null,
        category: 'Saúde',
        color: 'green',
        kind: 'binary',
        frequency: 'daily',
        unitId: null,
        targetAmount: null,
      })
    })
    expect(onSaved).toHaveBeenCalledWith(savedActivity)
  })

  it('bloqueia o envio quando os campos obrigatórios estão vazios', async () => {
    const user = userEvent.setup()

    render(<ActivityFormDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Criar atividade' }))

    expect(await screen.findByText('Use pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe uma categoria.')).toBeInTheDocument()
    expect(activitiesService.create).not.toHaveBeenCalled()
  })

  it('move o foco para o primeiro campo inválido', async () => {
    const user = userEvent.setup()

    render(<ActivityFormDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Nome'), 'Corrida')
    await user.click(screen.getByRole('button', { name: 'Criar atividade' }))

    expect(screen.getByText('Informe uma categoria.')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toHaveFocus()
  })

  it('preenche o formulário ao editar uma atividade existente', () => {
    render(
      <ActivityFormDialog
        open
        activity={savedActivity}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Corrida')
    expect(screen.getByLabelText('Categoria')).toHaveValue('Saúde')
    expect(screen.getByRole('radio', { name: 'Verde' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })
})
