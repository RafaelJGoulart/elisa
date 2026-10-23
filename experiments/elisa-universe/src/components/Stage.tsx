import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { getModeMeta } from '@/data/modes'
import type {
  CategoryKey,
  HoverHandler,
  HoverTarget,
  UniverseDataset,
  UniverseEdge,
  UniverseNode,
  ViewMode,
} from '@/types/universe'
import { Legend } from './Legend'
import { PlanarScene } from './scenes/PlanarScene'
import { RegionsScene } from './scenes/RegionsScene'
import { SpatialScene } from './scenes/SpatialScene'

interface StageProps {
  mode: ViewMode
  dataset: UniverseDataset
  nodesById: Map<string, UniverseNode>
  activeNodes: UniverseNode[]
  activeEdges: UniverseEdge[]
  activeCategories: Set<CategoryKey>
  selectedId: string | null
  connectedIds: Set<string>
  motion: boolean
  resetToken: number
  onSelect: (nodeId: string | null) => void
}

export function Stage({
  mode,
  dataset,
  nodesById,
  activeNodes,
  activeEdges,
  activeCategories,
  selectedId,
  connectedIds,
  motion,
  resetToken,
  onSelect,
}: StageProps) {
  const modeMeta = getModeMeta(mode)
  const is3D = mode !== 'planar'
  const cameraPosition: [number, number, number] = mode === 'regions' ? [0, 3, 19] : [0, 0, 16]
  const stageRef = useRef<HTMLElement>(null)
  const [hover, setHover] = useState<{
    target: HoverTarget
    x: number
    y: number
  } | null>(null)

  const handleHover = useCallback<HoverHandler>((target, point) => {
    if (!target || !point) {
      setHover(null)
      return
    }

    const rect = stageRef.current?.getBoundingClientRect()
    setHover({
      target,
      x: point.x - (rect?.left ?? 0),
      y: point.y - (rect?.top ?? 0),
    })
  }, [])

  useEffect(() => {
    setHover(null)
  }, [mode])

  const tooltip = hover ? (
    <div
      className="node-tooltip"
      style={{
        left: Math.max(12, Math.min(hover.x + 16, (stageRef.current?.clientWidth ?? 0) - 232)),
        top: Math.max(12, Math.min(hover.y + 18, (stageRef.current?.clientHeight ?? 0) - 58)),
      }}
      role="tooltip"
      aria-hidden="true"
    >
      <span
        className="node-tooltip__dot"
        style={{ backgroundColor: hover.target.color }}
      />
      <span className="node-tooltip__title">{hover.target.title}</span>
      {hover.target.kind ? (
        <span className="node-tooltip__kind">{hover.target.kind}</span>
      ) : null}
    </div>
  ) : null

  return (
    <section
      ref={stageRef}
      className={`stage stage--${mode}`}
      data-mode={mode}
      aria-label={`Visualização ${modeMeta.label}. ${modeMeta.description}`}
    >
      <div className="stage__visual" aria-hidden={is3D ? true : undefined}>
        {is3D ? (
          <Canvas
            key={mode}
            camera={{ position: cameraPosition, fov: 48, near: 0.1, far: 100 }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onPointerMissed={() => onSelect(null)}
          >
            <Suspense fallback={null}>
              {mode === 'spatial' ? (
                <SpatialScene
                  dataset={dataset}
                  nodesById={nodesById}
                  activeNodes={activeNodes}
                  activeEdges={activeEdges}
                  selectedId={selectedId}
                  connectedIds={connectedIds}
                  motion={motion}
                  resetToken={resetToken}
                  onSelect={onSelect}
                  onHover={handleHover}
                />
              ) : (
                <RegionsScene
                  dataset={dataset}
                  nodesById={nodesById}
                  activeNodes={activeNodes}
                  activeEdges={activeEdges}
                  selectedId={selectedId}
                  connectedIds={connectedIds}
                  motion={motion}
                  resetToken={resetToken}
                  onSelect={onSelect}
                  onHover={handleHover}
                />
              )}
            </Suspense>
          </Canvas>
        ) : (
          <PlanarScene
            dataset={dataset}
            activeNodes={activeNodes}
            activeEdges={activeEdges}
            selectedId={selectedId}
            resetToken={resetToken}
            onSelect={onSelect}
          />
        )}
      </div>

      <div className="stage__grain" aria-hidden="true" />

      {tooltip}

      <div className="mode-caption">
        <span className="mode-caption__letter">{modeMeta.letter}</span>
        <div>
          <p className="eyebrow">Modo {modeMeta.letter}</p>
          <h2>{modeMeta.label}</h2>
          <p>{modeMeta.description}</p>
        </div>
      </div>

      <Legend dataset={dataset} activeCategories={activeCategories} />

      {is3D ? (
        <p className="stage__hint">Arraste para orbitar · role para zoom · clique em um nó</p>
      ) : null}

      {activeNodes.length === 0 ? (
        <div className="stage-empty" role="status">
          <p className="eyebrow">Recorte vazio</p>
          <h2>Nenhum registro visível</h2>
          <p>Ajuste a busca ou reative uma categoria no painel de exploração.</p>
        </div>
      ) : null}
    </section>
  )
}
