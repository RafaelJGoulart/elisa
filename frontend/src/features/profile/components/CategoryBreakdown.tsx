import { Icon } from '@/components/shared/Icon'
import { formatInteger } from '@/features/profile/format'
import type { XpCategory } from '@/features/profile/types'

export function CategoryBreakdown({ categories }: { categories: XpCategory[] }) {
  const largest = Math.max(...categories.map((category) => category.xp), 1)

  return (
    <section
      aria-labelledby="profile-categories-title"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="profile-categories-title" className="text-sm font-semibold text-foreground">
            EXP por categoria
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Nesta versão, apenas hábitos concedem experiência.
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
          <Icon name="pie-chart" size={15} />
        </span>
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-text-secondary">
          Ainda não há EXP distribuído por categoria.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {categories.map((category) => (
            <li key={category.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{category.label}</span>
                <span className="font-mono text-xs text-text-secondary">
                  {formatInteger(category.xp)} EXP
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(category.xp / largest) * 100}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
