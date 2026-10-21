import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiaryPage } from './DiaryPage'
import { ToastProvider } from '@/components/shared/ToastProvider'
import { diaryService } from '@/services/diary'
import type { DiaryEntry, DiaryListResponse } from '@/features/diary/types'

vi.mock('@/services/diary', () => ({
  diaryService: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

const emptyList: DiaryListResponse = {
  entries: [],
  hasMore: false,
  limit: 50,
  offset: 0,
}

const createdEntry: DiaryEntry = {
  id: 'e'.repeat(32),
  title: 'Primeiro registro',
  content: 'Um começo tranquilo.',
  tags: ['pessoal'],
  createdAt: '2026-10-21T12:00:00Z',
  updatedAt: '2026-10-21T12:00:00Z',
}

function renderPage(initialEntry = '/diario') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <DiaryPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DiaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(diaryService.list).mockResolvedValue(emptyList)
  })

  it('aplica o mês da URL ao carregar a lista', async () => {
    renderPage('/diario?month=2026-10')

    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument()

    await waitFor(() => {
      expect(diaryService.list).toHaveBeenCalledWith(
        expect.objectContaining({ month: '2026-10', limit: 50 }),
      )
    })
  })

  it('cria um registro e confirma o salvamento', async () => {
    const user = userEvent.setup()
    vi.mocked(diaryService.create).mockResolvedValue(createdEntry)

    renderPage()

    await screen.findByText('Seu Diário começa aqui')
    await user.type(screen.getByLabelText('Título (opcional)'), 'Primeiro registro')
    await user.type(
      screen.getByLabelText('O que você quer guardar?'),
      'Um começo tranquilo.',
    )
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))

    await waitFor(() => {
      expect(diaryService.create).toHaveBeenCalledWith({
        title: 'Primeiro registro',
        content: 'Um começo tranquilo.',
        tags: [],
      })
    })
    expect(await screen.findByText('Registro salvo')).toBeInTheDocument()
  })
})
