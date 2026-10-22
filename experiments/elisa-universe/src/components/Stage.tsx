import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { getModeMeta } from '@/data/modes'
import type {
  CategoryKey,
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

  return (
    <section
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
