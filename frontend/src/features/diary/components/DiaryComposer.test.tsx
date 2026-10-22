import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiaryComposer } from './DiaryComposer'
import { diaryService } from '@/services/diary'
import type { DiaryEntry } from '@/features/diary/types'

vi.mock('@/services/diary', () => ({
  diaryService: {
    create: vi.fn(),
  },
}))

const createdEntry: DiaryEntry = {
  id: 'a'.repeat(32),
  title: 'Um dia comum',
  content: 'Hoje observei o céu.',
  tags: ['pessoal', 'ideias'],
  createdAt: '2026-10-21T12:00:00Z',
  updatedAt: '2026-10-21T12:00:00Z',
}

describe('DiaryComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia o texto, normaliza o título e remove etiquetas repetidas', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(diaryService.create).mockResolvedValue(createdEntry)

    render(<DiaryComposer onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Título (opcional)'), '  Um dia comum  ')
    await user.type(
      screen.getByLabelText('O que você quer guardar?'),
      'Hoje observei o céu.',
    )
    await user.type(
      screen.getByLabelText('Etiquetas (opcional)'),
      'pessoal, ideias, pessoal',
    )
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))

    await waitFor(() => {
      expect(diaryService.create).toHaveBeenCalledWith({
        title: 'Um dia comum',
        content: 'Hoje observei o céu.',
        tags: ['pessoal', 'ideias'],
      })
    })
    expect(onSaved).toHaveBeenCalledWith(createdEntry)
    expect(screen.getByLabelText('O que você quer guardar?')).toHaveValue('')
  })

  it('bloqueia registro vazio', async () => {
    const user = userEvent.setup()

    render(<DiaryComposer onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))

    expect(await screen.findByText('Escreva algo antes de salvar.')).toBeInTheDocument()
    expect(diaryService.create).not.toHaveBeenCalled()
  })

  it('move o foco para o primeiro campo inválido', async () => {
    const user = userEvent.setup()

    render(<DiaryComposer onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))

    expect(await screen.findByText('Escreva algo antes de salvar.')).toBeInTheDocument()
    expect(screen.getByLabelText('O que você quer guardar?')).toHaveFocus()
  })

  it('preserva o texto quando o salvamento falha', async () => {
    const user = userEvent.setup()
    vi.mocked(diaryService.create).mockRejectedValue(
      new Error('Não foi possível gravar o arquivo.'),
    )

    render(<DiaryComposer onSaved={vi.fn()} />)

    const content = screen.getByLabelText('O que você quer guardar?')
    await user.type(content, 'Um pensamento que não quero perder.')
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))

    expect(
      await screen.findByText(/Não foi possível gravar o arquivo\./),
    ).toBeInTheDocument()
    expect(content).toHaveValue('Um pensamento que não quero perder.')
  })
})
