import { Icon } from '@/components/shared/Icon'
import { clampPercent } from '@/lib/format'
import { formatInteger } from '@/features/profile/format'
import type { UserProfile } from '@/features/profile/types'

type LevelProgressCardProps = Pick<
  UserProfile,
  | 'level'
  | 'totalXp'
  | 'nextLevelTotalXp'
  | 'xpIntoLevel'
  | 'xpToNextLevel'
  | 'xpForNextLevel'
  | 'progressPercent'
>

export function LevelProgressCard({
  level,
  totalXp,
  nextLevelTotalXp,
  xpIntoLevel,
  xpToNextLevel,
  xpForNextLevel,
  progressPercent,
}: LevelProgressCardProps) {
  const percent = clampPercent(progressPercent)

  return (
    <section
      aria-labelledby="profile-level-title"
      className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 sm:p-8"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <p
            id="profile-level-title"
            className="text-[11px] font-medium tracking-[0.16em] text-text-secondary uppercase"
          >
            Nível atual
          </p>
          <p className="mt-1 font-mono text-5xl font-semibold tracking-tight text-foreground">
            {formatInteger(level)}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            <span className="font-mono text-foreground">{formatInteger(totalXp)}</span> EXP
            acumulado
          </p>
        </div>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Icon name="award" size={26} />
        </span>
      </div>

      <div className="relative mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <span className="text-text-secondary">
            {formatInteger(xpIntoLevel)} de {formatInteger(xpForNextLevel)} EXP neste nível
          </span>
          <span className="font-mono text-foreground">
            Faltam {formatInteger(xpToNextLevel)} EXP
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso para o próximo nível"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          O nível {formatInteger(level + 1)} começa em {formatInteger(nextLevelTotalXp)} EXP
          acumulados.
        </p>
      </div>
    </section>
  )
}
