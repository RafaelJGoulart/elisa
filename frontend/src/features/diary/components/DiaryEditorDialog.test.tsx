import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiaryEditorDialog } from './DiaryEditorDialog'
import { diaryService } from '@/services/diary'
import type { DiaryEntry } from '@/features/diary/types'

vi.mock('@/services/diary', () => ({
  diaryService: {
    update: vi.fn(),
  },
}))

const entry: DiaryEntry = {
  id: 'b'.repeat(32),
  title: 'Planejamento',
  content: 'Escrever com calma.',
  tags: ['pessoal', 'rotina'],
  createdAt: '2026-10-20T09:00:00Z',
  updatedAt: '2026-10-20T09:00:00Z',
}

describe('DiaryEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preenche os campos e salva as alterações', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const updated = {
      ...entry,
      content: 'Escrever com calma todos os dias.',
      updatedAt: '2026-10-21T10:00:00Z',
    }
    vi.mocked(diaryService.update).mockResolvedValue(updated)

    render(
      <DiaryEditorDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        onSaved={onSaved}
      />,
    )

    const content = screen.getByLabelText('Conteúdo')
    expect(screen.getByLabelText('Título (opcional)')).toHaveValue('Planejamento')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()

    await user.clear(content)
    await user.type(content, 'Escrever com calma todos os dias.')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => {
      expect(diaryService.update).toHaveBeenCalledWith(entry.id, {
        title: 'Planejamento',
        content: 'Escrever com calma todos os dias.',
        tags: ['pessoal', 'rotina'],
      })
    })
    expect(onSaved).toHaveBeenCalledWith(updated)
  })

  it('pede confirmação antes de descartar mudanças não salvas', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <DiaryEditorDialog
        open
        onOpenChange={onOpenChange}
        entry={entry}
        onSaved={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Conteúdo'), ' Mais uma frase.')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Descartar alterações?')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(diaryService.update).not.toHaveBeenCalled()
  })
})
