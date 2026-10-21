import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiaryEntryList } from './DiaryEntryList'
import { diaryService } from '@/services/diary'
import type { DiaryListResponse } from '@/features/diary/types'

vi.mock('@/services/diary', () => ({
  diaryService: {
    list: vi.fn(),
  },
}))

const now = new Date().toISOString()

const response: DiaryListResponse = {
  entries: [
    {
      id: 'c'.repeat(32),
      title: 'Reflexão da manhã',
      tags: ['pessoal', 'calma', 'ideias', 'extra'],
      createdAt: now,
      updatedAt: now,
      excerpt: 'Percebi que preciso de mais pausas durante o dia.',
    },
    {
      id: 'd'.repeat(32),
      title: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      excerpt: 'Um registro sem título.',
    },
  ],
  hasMore: false,
  limit: 50,
  offset: 0,
}

describe('DiaryEntryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista os registros agrupados por data e abre o selecionado', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    vi.mocked(diaryService.list).mockResolvedValue(response)

    render(
      <DiaryEntryList
        filters={{ query: 'pausa', month: '2026-10' }}
        reloadToken={0}
        selectedId={null}
        onSelect={onSelect}
        onResetFilters={vi.fn()}
        onStartWriting={vi.fn()}
      />,
    )

    expect(await screen.findByText('Reflexão da manhã')).toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
    expect(screen.getByText('Sem título')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.getByText(/Percebi que preciso de mais pausas/)).toBeInTheDocument()

    await waitFor(() => {
      expect(diaryService.list).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'pausa', month: '2026-10', limit: 50 }),
      )
    })

    await user.click(screen.getByRole('button', { name: /Reflexão da manhã/ }))
    expect(onSelect).toHaveBeenCalledWith(response.entries[0])
  })

  it('oferece limpar filtros quando a busca não encontra registros', async () => {
    const user = userEvent.setup()
    const onResetFilters = vi.fn()
    vi.mocked(diaryService.list).mockResolvedValue({
      entries: [],
      hasMore: false,
      limit: 50,
      offset: 0,
    })

    render(
      <DiaryEntryList
        filters={{ query: 'inexistente', month: null }}
        reloadToken={0}
        selectedId={null}
        onSelect={vi.fn()}
        onResetFilters={onResetFilters}
        onStartWriting={vi.fn()}
      />,
    )

    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument()
    expect(screen.getByText(/Nada corresponde a “inexistente”/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(onResetFilters).toHaveBeenCalled()
  })

  it('mostra erro com opção de tentar novamente', async () => {
    vi.mocked(diaryService.list).mockRejectedValue(
      new Error('O índice local não respondeu.'),
    )

    render(
      <DiaryEntryList
        filters={{ query: '', month: null }}
        reloadToken={0}
        selectedId={null}
        onSelect={vi.fn()}
        onResetFilters={vi.fn()}
        onStartWriting={vi.fn()}
      />,
    )

    expect(
      await screen.findByText('O índice local não respondeu.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
