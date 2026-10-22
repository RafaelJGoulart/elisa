import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories'
import type { CategoryKey, UniverseDataset } from '@/types/universe'

interface LegendProps {
  dataset: UniverseDataset
  activeCategories: Set<CategoryKey>
}

export function Legend({ dataset, activeCategories }: LegendProps) {
  const counts = new Map<CategoryKey, number>()
  for (const node of dataset.nodes) {
    counts.set(node.category, (counts.get(node.category) ?? 0) + 1)
  }

  return (
    <div className="legend" aria-label="Legenda de categorias">
      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category]
        const active = activeCategories.has(category)
        return (
          <span key={category} className={`legend__item ${active ? '' : 'is-muted'}`}>
            <span className="legend__dot" style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
            <span className="legend__count">{counts.get(category) ?? 0}</span>
          </span>
        )
      })}
    </div>
  )
}
