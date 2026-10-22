import { useMemo } from 'react'
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories'
import type { CategoryKey, UniverseDataset, UniverseNode } from '@/types/universe'

interface SidebarProps {
  dataset: UniverseDataset
  activeNodes: UniverseNode[]
  activeCategories: Set<CategoryKey>
  query: string
  selectedId: string | null
  open: boolean
  onQueryChange: (value: string) => void
  onToggleCategory: (category: CategoryKey) => void
  onShowAllCategories: () => void
  onSelect: (nodeId: string) => void
  onClose: () => void
}

export function Sidebar({
  dataset,
  activeNodes,
  activeCategories,
  query,
  selectedId,
  open,
  onQueryChange,
  onToggleCategory,
  onShowAllCategories,
  onSelect,
  onClose,
}: SidebarProps) {
  const counts = useMemo(() => {
    const result = new Map<CategoryKey, number>()
    for (const node of dataset.nodes) {
      result.set(node.category, (result.get(node.category) ?? 0) + 1)
    }
    return result
  }, [dataset.nodes])

  const sortedNodes = useMemo(() => {
    return [...activeNodes].sort((left, right) => {
      const categoryOrder =
        CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category)
      if (categoryOrder !== 0) return categoryOrder
      return left.title.localeCompare(right.title, 'pt-BR')
    })
  }, [activeNodes])

  return (
    <aside
      id="explorer-panel"
      className={`explorer-panel ${open ? 'is-open' : ''}`}
      aria-label="Explorar registros"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Explorar</p>
          <h2>Mapa de registros</h2>
        </div>
        <button type="button" className="icon-button panel-close" aria-label="Fechar explorador" onClick={onClose}>
          ×
        </button>
      </div>

      <label className="search-field">
        <span className="search-field__label">Buscar</span>
        <span className="search-field__control">
          <input
            type="search"
            value={query}
            placeholder="Título, resumo ou etiqueta"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-field__clear"
              aria-label="Limpar busca"
              onClick={() => onQueryChange('')}
            >
              ×
            </button>
          ) : null}
        </span>
      </label>

      <div className="filter-block">
        <div className="filter-block__heading">
          <span>Categorias</span>
          <button type="button" className="text-button" onClick={onShowAllCategories}>
            Todas
          </button>
        </div>
        <div className="filter-chips" role="group" aria-label="Filtrar por categoria">
          {CATEGORY_ORDER.map((category) => {
            const meta = CATEGORY_META[category]
            const active = activeCategories.has(category)
            return (
              <button
                key={category}
                type="button"
                className={`filter-chip ${active ? 'is-active' : ''}`}
                aria-pressed={active}
                onClick={() => onToggleCategory(category)}
              >
                <span className="filter-chip__dot" style={{ backgroundColor: meta.color }} />
                {meta.label}
                <span className="filter-chip__count">{counts.get(category) ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="result-heading">
        <span>
          {activeNodes.length} {activeNodes.length === 1 ? 'registro visível' : 'registros visíveis'}
        </span>
        <span className="result-heading__hint">Tab + Enter</span>
      </div>

      <div className="record-list" role="list" aria-label="Registros visíveis">
        {sortedNodes.length === 0 ? (
          <div className="panel-empty">
            <p>Nenhum registro combina com a busca e os filtros atuais.</p>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onQueryChange('')
                onShowAllCategories()
              }}
            >
              Limpar busca e filtros
            </button>
          </div>
        ) : (
          sortedNodes.map((node) => {
            const meta = CATEGORY_META[node.category]
            const selected = node.id === selectedId
            return (
              <button
                key={node.id}
                type="button"
                className={`record-item ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => onSelect(node.id)}
              >
                <span className="record-item__marker" style={{ backgroundColor: meta.color }} />
                <span className="record-item__text">
                  <span className="record-item__title">{node.title}</span>
                  <span className="record-item__meta">
                    {meta.singular} · {node.date}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>

      <p className="panel-footnote">
        Lista alternativa para leitura e navegação por teclado. Os filtros também afetam os três modos.
      </p>
    </aside>
  )
}
