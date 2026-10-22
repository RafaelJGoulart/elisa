import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfilePage } from './ProfilePage'
import { profileService } from '@/services/profile'
import type { UserProfile } from '@/features/profile/types'

vi.mock('@/services/profile', () => ({
  profileService: {
    get: vi.fn(),
  },
}))

const populatedProfile: UserProfile = {
  level: 2,
  totalXp: 20,
  currentLevelTotalXp: 16,
  nextLevelTotalXp: 32,
  xpIntoLevel: 4,
  xpToNextLevel: 12,
  xpForNextLevel: 16,
  progressPercent: 25,
  stats: {
    habitOccurrences: 12,
    habitWeeks: 1,
    habitXp: 20,
  },
  categories: [{ key: 'habits', label: 'Hábitos', xp: 20 }],
  recentEvents: [
    {
      id: 2,
      source: 'habit',
      category: 'habits',
      categoryLabel: 'Hábitos',
      kind: 'weekly_bonus',
      reason: 'grant',
      description: 'Semana completa: Leitura',
      amount: 7,
      activityDate: '2026-10-17',
      recordedAt: '2026-10-18T10:00:00Z',
    },
    {
      id: 1,
      source: 'habit',
      category: 'habits',
      categoryLabel: 'Hábitos',
      kind: 'occurrence',
      reason: 'grant',
      description: 'Hábito concluído: Leitura',
      amount: 1,
      activityDate: '2026-10-18',
      recordedAt: '2026-10-18T09:00:00Z',
    },
    {
      id: 3,
      source: 'habit',
      category: 'habits',
      categoryLabel: 'Hábitos',
      kind: 'occurrence',
      reason: 'correction',
      description: 'Estorno: Hábito concluído: Leitura',
      amount: -1,
      activityDate: '2026-10-18',
      recordedAt: '2026-10-18T11:00:00Z',
    },
  ],
}

const emptyProfile: UserProfile = {
  level: 0,
  totalXp: 0,
  currentLevelTotalXp: 0,
  nextLevelTotalXp: 7,
  xpIntoLevel: 0,
  xpToNextLevel: 7,
  xpForNextLevel: 7,
  progressPercent: 0,
  stats: {
    habitOccurrences: 0,
    habitWeeks: 0,
    habitXp: 0,
  },
  categories: [],
  recentEvents: [],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra nível, progresso, estatísticas e extrato', async () => {
    vi.mocked(profileService.get).mockResolvedValue(populatedProfile)

    renderPage()

    expect(await screen.findByText('Nível atual')).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' && element.textContent === '20 EXP acumulado',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Faltam 12 EXP')).toBeInTheDocument()

    const progress = screen.getByRole('progressbar', {
      name: 'Progresso para o próximo nível',
    })
    expect(progress).toHaveAttribute('aria-valuenow', '25')

    const occurrences = screen
      .getByText('Ocorrências de hábitos')
      .closest('div') as HTMLElement
    expect(within(occurrences).getByText('12')).toBeInTheDocument()

    const weeks = screen.getByText('Semanas concluídas').closest('div') as HTMLElement
    expect(within(weeks).getByText('1')).toBeInTheDocument()

    expect(screen.getByText('EXP por categoria')).toBeInTheDocument()
    expect(screen.getByText('Hábitos')).toBeInTheDocument()
    expect(screen.getByText('Semana completa: Leitura')).toBeInTheDocument()
    expect(screen.getByText('+7 EXP')).toBeInTheDocument()
    expect(screen.getByText('-1 EXP')).toBeInTheDocument()
  })

  it('explica como conquistar o primeiro EXP quando o perfil está vazio', async () => {
    vi.mocked(profileService.get).mockResolvedValue(emptyProfile)

    renderPage()

    expect(
      await screen.findByText('Seu primeiro EXP está a um hábito de distância'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' && element.textContent === '0 EXP acumulado',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Progresso para o próximo nível' }),
    ).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('link', { name: 'Registrar um hábito' })).toHaveAttribute(
      'href',
      '/atividades',
    )
  })

  it('mantém o extrato visível quando o saldo volta a zero', async () => {
    vi.mocked(profileService.get).mockResolvedValue({
      ...emptyProfile,
      recentEvents: [
        {
          id: 2,
          source: 'habit',
          category: 'habits',
          categoryLabel: 'Hábitos',
          kind: 'occurrence',
          reason: 'correction',
          description: 'Estorno: Hábito concluído: Leitura',
          amount: -1,
          activityDate: '2026-10-18',
          recordedAt: '2026-10-18T11:00:00Z',
        },
      ],
    })

    renderPage()

    expect(await screen.findByText('Histórico recente')).toBeInTheDocument()
    expect(screen.getByText('Estorno: Hábito concluído: Leitura')).toBeInTheDocument()
    expect(
      screen.queryByText('Seu primeiro EXP está a um hábito de distância'),
    ).not.toBeInTheDocument()
  })

  it('mostra erro com opção de tentar novamente', async () => {
    vi.mocked(profileService.get).mockRejectedValue(new Error('Servidor indisponível'))

    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Servidor indisponível')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
