import { useMemo } from 'react'
import { CATEGORY_META, RELATION_LABELS } from '@/data/categories'
import type { UniverseEdge, UniverseNode } from '@/types/universe'

interface DetailsPanelProps {
  node: UniverseNode | null
  nodesById: Map<string, UniverseNode>
  activeEdges: UniverseEdge[]
  allEdges: UniverseEdge[]
  onSelect: (nodeId: string | null) => void
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function DetailsPanel({
  node,
  nodesById,
  activeEdges,
  allEdges,
  onSelect,
}: DetailsPanelProps) {
  const relations = useMemo(() => {
    if (!node) return []
    return activeEdges.flatMap((edge) => {
      if (edge.source !== node.id && edge.target !== node.id) return []
      const otherId = edge.source === node.id ? edge.target : edge.source
      const other = nodesById.get(otherId)
      return other ? [{ edge, other }] : []
    })
  }, [activeEdges, node, nodesById])

  const totalRelations = useMemo(() => {
    if (!node) return 0
    return allEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length
  }, [allEdges, node])

  if (!node) {
    return (
      <aside className="details-panel is-empty" aria-label="Detalhes do registro">
        <div className="empty-orbit" aria-hidden="true">
          <span />
        </div>
        <p className="eyebrow">Nenhum registro selecionado</p>
        <h2>Escolha um ponto de luz</h2>
        <p className="details-intro">
          Clique em um nó do grafo ou use a lista de exploração. Cada registro revela sua categoria,
          data, etiquetas e relações.
        </p>
        <ul className="hint-list">
          <li>Arraste para orbitar ou mover.</li>
          <li>Use a roda do mouse para aproximar.</li>
          <li>Ative “Movimento” para uma câmera mais viva.</li>
        </ul>
      </aside>
    )
  }

  const meta = CATEGORY_META[node.category]

  return (
    <aside className="details-panel has-selection" aria-label="Detalhes do registro">
      <div className="details-topline">
        <span className="details-kicker">
          <span className="details-kicker__dot" style={{ backgroundColor: meta.color }} />
          {meta.singular}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar detalhes"
          onClick={() => onSelect(null)}
        >
          ×
        </button>
      </div>

      <h2>{node.title}</h2>
      <p className="details-summary">{node.summary}</p>

      <div className="details-meta">
        <span>{formatDate(node.date)}</span>
        <span>{meta.label}</span>
      </div>

      <div className="tag-list" aria-label="Etiquetas">
        {node.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <p className="details-body">{node.detail}</p>

      <section className="relations" aria-labelledby="relations-title">
        <div className="relations__heading">
          <h3 id="relations-title">Relações</h3>
          <span>{relations.length}</span>
        </div>

        {relations.length === 0 ? (
          <p className="relations__empty">
            {totalRelations === 0
              ? 'Este registro está isolado: não possui conexões no conjunto fictício.'
              : 'As relações existentes estão fora dos filtros atuais.'}
          </p>
        ) : (
          <ul className="relations__list">
            {relations.map(({ edge, other }) => {
              const otherMeta = CATEGORY_META[other.category]
              return (
                <li key={edge.id}>
                  <button type="button" className="relation-item" onClick={() => onSelect(other.id)}>
                    <span
                      className="relation-item__dot"
                      style={{ backgroundColor: otherMeta.color }}
                    />
                    <span className="relation-item__text">
                      <span className="relation-item__title">{other.title}</span>
                      <span className="relation-item__kind">{RELATION_LABELS[edge.kind]}</span>
                    </span>
                    <span className="relation-item__arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <button type="button" className="button button--quiet details-clear" onClick={() => onSelect(null)}>
        Limpar seleção
      </button>
    </aside>
  )
}
