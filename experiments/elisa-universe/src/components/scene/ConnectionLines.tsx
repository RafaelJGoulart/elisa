import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { CATEGORY_META } from '@/data/categories'
import type { Point3 } from '@/lib/layout'
import type { UniverseEdge, UniverseNode, ViewMode } from '@/types/universe'

interface ConnectionLinesProps {
  edges: UniverseEdge[]
  nodesById: Map<string, UniverseNode>
  positions: Map<string, Point3>
  selectedId: string | null
  mode: Exclude<ViewMode, 'planar'>
}

interface ConnectionLineProps {
  edge: UniverseEdge
  nodesById: Map<string, UniverseNode>
  positions: Map<string, Point3>
  selected: boolean
  muted: boolean
  curved: boolean
}

function ConnectionLine({
  edge,
  nodesById,
  positions,
  selected,
  muted,
  curved,
}: ConnectionLineProps) {
  const points = useMemo(() => {
    const start = positions.get(edge.source)
    const end = positions.get(edge.target)
    if (!start || !end) return null

    if (!curved) {
      return [new THREE.Vector3(...start), new THREE.Vector3(...end)]
    }

    const startPoint = new THREE.Vector3(...start)
    const endPoint = new THREE.Vector3(...end)
    const midpoint = startPoint.clone().add(endPoint).multiplyScalar(0.5)
    midpoint.y += 0.65
    midpoint.z += 0.25
    return new THREE.QuadraticBezierCurve3(startPoint, midpoint, endPoint).getPoints(28)
  }, [curved, edge.source, edge.target, positions])

  if (!points) return null

  const source = nodesById.get(edge.source)
  const color = source ? CATEGORY_META[source.category].color : '#9fb7d7'
  const opacity = muted ? 0.035 : selected ? 0.72 : curved ? 0.16 : 0.22

  return (
    <Line
      points={points}
      color={color}
      lineWidth={selected ? 1.7 : 0.9}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  )
}

export function ConnectionLines({
  edges,
  nodesById,
  positions,
  selectedId,
  mode,
}: ConnectionLinesProps) {
  return (
    <group>
      {edges.map((edge) => {
        const selected = edge.source === selectedId || edge.target === selectedId
        const muted = Boolean(selectedId) && !selected
        return (
          <ConnectionLine
            key={edge.id}
            edge={edge}
            nodesById={nodesById}
            positions={positions}
            selected={selected}
            muted={muted}
            curved={mode === 'regions'}
          />
        )
      })}
    </group>
  )
}
