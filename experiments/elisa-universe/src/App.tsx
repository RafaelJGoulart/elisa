import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_ORDER } from '@/data/categories'
import { MOCK_UNIVERSE } from '@/data/mockUniverse'
import { getConnectedNodeIds } from '@/lib/layout'
import { filterEdges, filterNodes } from '@/lib/universe'
import type { CategoryKey, ViewMode } from '@/types/universe'
import { DetailsPanel } from '@/components/DetailsPanel'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Stage } from '@/components/Stage'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export default function App() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [mode, setMode] = useState<ViewMode>('spatial')
  const [query, setQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    () => new Set(CATEGORY_ORDER),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [motion, setMotion] = useState(() => !prefersReducedMotion)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetToken, setResetToken] = useState(0)

  useEffect(() => {
    setMotion(!prefersReducedMotion)
  }, [prefersReducedMotion])

  const nodesById = useMemo(
    () => new Map(MOCK_UNIVERSE.nodes.map((node) => [node.id, node])),
    [],
  )

  const activeNodes = useMemo(
    () => filterNodes(MOCK_UNIVERSE.nodes, activeCategories, query),
    [activeCategories, query],
  )

  const activeNodeIds = useMemo(() => new Set(activeNodes.map((node) => node.id)), [activeNodes])

  const activeEdges = useMemo(
    () => filterEdges(MOCK_UNIVERSE.edges, activeNodeIds),
    [activeNodeIds],
  )

  const connectedIds = useMemo(() => {
    if (!selectedId) return new Set<string>()
    return getConnectedNodeIds(selectedId, activeEdges)
  }, [activeEdges, selectedId])

  const selectedNode = selectedId ? (nodesById.get(selectedId) ?? null) : null

  useEffect(() => {
    if (selectedId && !activeNodeIds.has(selectedId)) {
      setSelectedId(null)
    }
  }, [activeNodeIds, selectedId])

  const handleModeChange = (nextMode: ViewMode) => {
    setMode(nextMode)
    setResetToken((current) => current + 1)
  }

  const handleToggleCategory = (category: CategoryKey) => {
    setActiveCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleSelect = (nodeId: string | null) => {
    setSelectedId(nodeId)
    if (nodeId && window.matchMedia('(max-width: 1120px)').matches) {
      setSidebarOpen(false)
    }
  }

  const handleResetView = () => {
    setResetToken((current) => current + 1)
    setSelectedId(null)
  }

  const selectedCount = activeNodes.length
  const totalCount = MOCK_UNIVERSE.nodes.length

  return (
    <div className="app-shell">
      <Header
        mode={mode}
        motion={motion}
        sidebarOpen={sidebarOpen}
        onModeChange={handleModeChange}
        onToggleMotion={() => setMotion((current) => !current)}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        onResetView={handleResetView}
      />

      <div className="workspace">
        <Sidebar
          dataset={MOCK_UNIVERSE}
          activeNodes={activeNodes}
          activeCategories={activeCategories}
          query={query}
          selectedId={selectedId}
          open={sidebarOpen}
          onQueryChange={setQuery}
          onToggleCategory={handleToggleCategory}
          onShowAllCategories={() => setActiveCategories(new Set(CATEGORY_ORDER))}
          onSelect={(nodeId: string) => handleSelect(nodeId)}
          onClose={() => setSidebarOpen(false)}
        />

        <button
          type="button"
          className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
          aria-label="Fechar explorador"
          onClick={() => setSidebarOpen(false)}
        />

        <Stage
          mode={mode}
          dataset={MOCK_UNIVERSE}
          nodesById={nodesById}
          activeNodes={activeNodes}
          activeEdges={activeEdges}
          activeCategories={activeCategories}
          selectedId={selectedId}
          connectedIds={connectedIds}
          motion={motion}
          resetToken={resetToken}
          onSelect={handleSelect}
        />

        <DetailsPanel
          node={selectedNode}
          nodesById={nodesById}
          activeEdges={activeEdges}
          allEdges={MOCK_UNIVERSE.edges}
          onSelect={handleSelect}
        />
      </div>

      <footer className="app-footer">
        <span className="app-footer__dot" aria-hidden="true" />
        <span>
          {MOCK_UNIVERSE.name} · dados fictícios · {selectedCount} de {totalCount} registros
          visíveis · nenhuma conexão com a Elisa principal
        </span>
      </footer>
    </div>
  )
}
