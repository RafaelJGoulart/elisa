import { useMemo } from 'react'
import { CATEGORY_ORDER } from '@/data/categories'
import { buildGraphPositions, getRegionAnchor } from '@/lib/layout'
import type { UniverseDataset, UniverseEdge, UniverseNode } from '@/types/universe'
import { CameraRig } from '@/components/scene/CameraRig'
import { ConnectionLines } from '@/components/scene/ConnectionLines'
import { CoreOrb } from '@/components/scene/CoreOrb'
import { NodeOrb } from '@/components/scene/NodeOrb'
import { RegionShell } from '@/components/scene/RegionShell'
import { Starfield } from '@/components/scene/Starfield'

interface RegionsSceneProps {
  dataset: UniverseDataset
  nodesById: Map<string, UniverseNode>
  activeNodes: UniverseNode[]
  activeEdges: UniverseEdge[]
  selectedId: string | null
  connectedIds: Set<string>
  motion: boolean
  resetToken: number
  onSelect: (nodeId: string) => void
}

function AmbientOrbits() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[8.4, 0.006, 6, 140]} />
        <meshBasicMaterial color="#34526e" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.4, 0.3, 0]}>
        <torusGeometry args={[10.2, 0.004, 6, 140]} />
        <meshBasicMaterial color="#2c405c" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh rotation={[-0.35, 0.5, 0]}>
        <torusGeometry args={[6.4, 0.004, 6, 120]} />
        <meshBasicMaterial color="#426077" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function RegionsScene({
  dataset,
  nodesById,
  activeNodes,
  activeEdges,
  selectedId,
  connectedIds,
  motion,
  resetToken,
  onSelect,
}: RegionsSceneProps) {
  const positions = useMemo(() => buildGraphPositions(dataset, 'regions'), [dataset])
  const activeCategories = useMemo(
    () => new Set(activeNodes.map((node) => node.category)),
    [activeNodes],
  )
  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of activeNodes) {
      counts.set(node.category, (counts.get(node.category) ?? 0) + 1)
    }
    return counts
  }, [activeNodes])

  return (
    <>
      <color attach="background" args={['#04060b']} />
      <fog attach="fog" args={['#04060b', 16, 70]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#b7ddff', '#0f1220', 0.48]} />
      <directionalLight position={[8, 11, 9]} intensity={0.9} color="#c7e4ff" />
      <pointLight position={[-7, 4, -8]} intensity={0.55} color="#7c83d9" />

      <Starfield motion={motion} count={1100} />
      <AmbientOrbits />
      <CoreOrb motion={motion} />
      <CameraRig mode="regions" resetToken={resetToken} motion={motion} />

      {CATEGORY_ORDER.map((category) => {
        if (!activeCategories.has(category)) return null
        return (
          <RegionShell
            key={category}
            category={category}
            anchor={getRegionAnchor(category)}
            nodeCount={countsByCategory.get(category) ?? 0}
          />
        )
      })}

      <ConnectionLines
        edges={activeEdges}
        nodesById={nodesById}
        positions={positions}
        selectedId={selectedId}
        mode="regions"
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
          />
        )
      })}
    </>
  )
}
