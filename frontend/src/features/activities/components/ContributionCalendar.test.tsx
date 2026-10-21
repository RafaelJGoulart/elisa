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
  })
})
