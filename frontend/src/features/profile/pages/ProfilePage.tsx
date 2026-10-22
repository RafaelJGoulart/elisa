import { useCallback } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Icon } from '@/components/shared/Icon'
import { LoadingState } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { getErrorMessage } from '@/lib/errors'
import { profileService } from '@/services/profile'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { LevelProgressCard } from '../components/LevelProgressCard'
import { ProfileStatCards } from '../components/ProfileStatCards'
import { XpHistoryList } from '../components/XpHistoryList'

export function ProfilePage() {
  const loadProfile = useCallback(
    (signal: AbortSignal) => profileService.get(signal),
    [],
  )
  const { data, loading, error, reload } = useAsyncResource(loadProfile, [])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Perfil"
        title="Seu progresso"
        description="A experiência é construída aos poucos, a partir dos hábitos que você conclui. Nesta versão, ela ainda não vem de outras áreas da Elisa."
        actions={
          <Button asChild variant="outline">
            <Link to="/atividades">
              <Icon name="activity" size={15} />
              Ver atividades
            </Link>
          </Button>
        }
      />

      {loading && !data ? <LoadingState rows={3} /> : null}

      {error && !data ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : null}

      {data ? (
        <>
          <LevelProgressCard {...data} />
          <ProfileStatCards stats={data.stats} />

          {data.totalXp === 0 && data.recentEvents.length === 0 ? (
            <EmptyState
              icon="zap"
              title="Seu primeiro EXP está a um hábito de distância"
              description="Marque um hábito como concluído hoje. Cada ocorrência vale 1 EXP, e uma semana completa acrescenta um bônus."
              action={
                <Button asChild>
                  <Link to="/atividades">
                    <Icon name="check-circle" size={15} />
                    Registrar um hábito
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <CategoryBreakdown categories={data.categories} />
              <XpHistoryList events={data.recentEvents} />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
