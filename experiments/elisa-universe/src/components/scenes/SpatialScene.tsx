import { useMemo } from 'react'
import { buildGraphPositions } from '@/lib/layout'
import type {
  HoverHandler,
  UniverseDataset,
  UniverseEdge,
  UniverseNode,
} from '@/types/universe'
import { CameraRig } from '@/components/scene/CameraRig'
import { ConnectionLines } from '@/components/scene/ConnectionLines'
import { NodeOrb } from '@/components/scene/NodeOrb'
import { Starfield } from '@/components/scene/Starfield'

interface SpatialSceneProps {
  dataset: UniverseDataset
  nodesById: Map<string, UniverseNode>
  activeNodes: UniverseNode[]
  activeEdges: UniverseEdge[]
  selectedId: string | null
  connectedIds: Set<string>
  motion: boolean
  resetToken: number
  onSelect: (nodeId: string) => void
  onHover: HoverHandler
}

export function SpatialScene({
  dataset,
  nodesById,
  activeNodes,
  activeEdges,
  selectedId,
  connectedIds,
  motion,
  resetToken,
  onSelect,
  onHover,
}: SpatialSceneProps) {
  const positions = useMemo(() => buildGraphPositions(dataset, 'spatial'), [dataset])

  return (
    <>
      <color attach="background" args={['#0b0b0d']} />
      <fog attach="fog" args={['#0b0b0d', 16, 62]} />
      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#cfeaff', '#111323', 0.55]} />
      <directionalLight position={[7, 9, 10]} intensity={1.15} color="#d8ecff" />
      <pointLight position={[-8, -4, -7]} intensity={0.82} color="#7f8cff" />

      <Starfield motion={motion} />
      <CameraRig mode="spatial" resetToken={resetToken} motion={motion} />

      <ConnectionLines
        edges={activeEdges}
        nodesById={nodesById}
        positions={positions}
        selectedId={selectedId}
        mode="spatial"
        motion={motion}
      />

      {activeNodes.map((node) => {
        const position = positions.get(node.id)
        if (!position) return null
        const dimmed = Boolean(selectedId) && node.id !== selectedId && !connectedIds.has(node.id)
        return (
          <NodeOrb
            key={node.id}
            node={node}
            position={position}
            selected={node.id === selectedId}
            dimmed={dimmed}
            motion={motion}
            onSelect={onSelect}
            onHover={onHover}
          />
        )
      })}

    </>
  )
}
