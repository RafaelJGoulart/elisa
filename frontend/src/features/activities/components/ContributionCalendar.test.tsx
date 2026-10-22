import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContributionCalendar } from './ContributionCalendar'

const range = { start: '2026-10-04', end: '2026-10-24' }

function renderCalendar(onSelectDate = vi.fn()) {
  render(
    <ContributionCalendar
      completedDates={['2026-10-20']}
      range={range}
      colorHex="#8B5CF6"
      selectedDate="2026-10-21"
      onSelectDate={onSelectDate}
      today="2026-10-21"
    />,
  )
  return onSelectDate
}

describe('ContributionCalendar', () => {
  it('diferencia dias concluídos, sem registro e futuros', () => {
    renderCalendar()

    expect(
      screen.getByRole('button', {
        name: /terça-feira, 20 de outubro de 2026 — concluído/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /quarta-feira, 21 de outubro de 2026 — sem registro/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    const futureDays = screen.getAllByRole('button', { name: /dia futuro/i })
    expect(futureDays).toHaveLength(3)
  })

  it('permite selecionar um dia para ver detalhes', async () => {
    const user = userEvent.setup()
    const onSelectDate = renderCalendar()

    await user.click(
      screen.getByRole('button', {
        name: /terça-feira, 20 de outubro de 2026 — concluído/i,
      }),
    )

    expect(onSelectDate).toHaveBeenCalledWith('2026-10-20')
  })

  it('mostra a legenda dos estados', () => {
    renderCalendar()
    expect(screen.getByText('Concluído')).toBeInTheDocument()
    expect(screen.getByText('Sem registro')).toBeInTheDocument()
    expect(screen.getByText('Futuro')).toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
  })

  it('informa o dia de hoje no rótulo acessível da célula', () => {
    renderCalendar()

    expect(
      screen.getByRole('button', {
        name: /quarta-feira, 21 de outubro de 2026 — sem registro — hoje/i,
      }),
    ).toBeInTheDocument()
  })

  it('mantém apenas uma célula na ordem de tabulação', () => {
    renderCalendar()

    const tabbable = screen
      .getAllByRole('button')
      .filter((cell) => cell.getAttribute('tabindex') === '0')

    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName(/21 de outubro de 2026/)
  })

  it('move o foco entre as células com as setas do teclado', async () => {
    const user = userEvent.setup()
    renderCalendar()

    screen.getByRole('button', { name: /21 de outubro de 2026/i }).focus()

    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('button', { name: /quinta-feira, 22 de outubro de 2026/i }),
    ).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(
      screen.getByRole('button', { name: /quarta-feira, 21 de outubro de 2026/i }),
    ).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(
      screen.getByRole('button', { name: /quarta-feira, 14 de outubro de 2026/i }),
    ).toHaveFocus()
  })

  it('não move o foco para fora do período exibido', async () => {
    const user = userEvent.setup()
    renderCalendar()

    screen.getByRole('button', { name: /21 de outubro de 2026/i }).focus()
    await user.keyboard('{ArrowDown}')

    expect(
      screen.getByRole('button', { name: /quarta-feira, 21 de outubro de 2026/i }),
    ).toHaveFocus()
  })
})
