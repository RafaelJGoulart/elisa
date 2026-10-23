import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_META } from '@/data/categories'
import { hashString, seededBetween } from '@/lib/random'
import type { Point3 } from '@/lib/layout'
import type { UniverseEdge, UniverseNode, ViewMode } from '@/types/universe'

interface ConnectionLinesProps {
  edges: UniverseEdge[]
  nodesById: Map<string, UniverseNode>
  positions: Map<string, Point3>
  selectedId: string | null
  mode: Exclude<ViewMode, 'planar'>
  motion: boolean
}

interface ConnectionLineProps {
  edge: UniverseEdge
  nodesById: Map<string, UniverseNode>
  positions: Map<string, Point3>
  selected: boolean
  muted: boolean
  curved: boolean
  motion: boolean
}

interface ConnectionPath {
  points: THREE.Vector3[]
  lengths: number[]
  total: number
}

function buildConnectionPath(points: THREE.Vector3[]): ConnectionPath {
  const lengths = [0]
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += points[index].distanceTo(points[index - 1])
    lengths.push(total)
  }
  return { points, lengths, total }
}

interface ConnectionSparkProps {
  path: ConnectionPath
  color: string
  offset: number
  speed: number
  size: number
  selected: boolean
  visible: boolean
}

function ConnectionSpark({
  path,
  color,
  offset,
  speed,
  size,
  selected,
  visible,
}: ConnectionSparkProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useRef(offset)

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || !visible) return

    progress.current = (progress.current + delta * speed) % 1
    const target = progress.current * path.total

    let index = 1
    while (index < path.lengths.length - 1 && path.lengths[index] < target) {
      index += 1
    }

    const start = path.points[index - 1]
    const end = path.points[index]
    const segmentLength = path.lengths[index] - path.lengths[index - 1]
    const local = segmentLength > 0 ? (target - path.lengths[index - 1]) / segmentLength : 0
    mesh.position.copy(start).lerp(end, local)
  })

  return (
    <mesh ref={meshRef} visible={visible} raycast={() => null}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={selected ? 0.95 : 0.68}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function ConnectionLine({
  edge,
  nodesById,
  positions,
  selected,
  muted,
  curved,
  motion,
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

  const path = useMemo(() => (points ? buildConnectionPath(points) : null), [points])

  const spark = useMemo(() => {
    const seed = hashString(edge.id)
    return {
      offset: seededBetween(seed, 0, 1),
      secondOffset: seededBetween(seed + 13, 0.18, 0.82),
      speed: seededBetween(seed + 29, 0.055, 0.14),
    }
  }, [edge.id])

  if (!points || !path) return null

  const source = nodesById.get(edge.source)
  const color = source ? CATEGORY_META[source.category].color : '#9fb7d7'
  const opacity = muted ? 0.035 : selected ? 0.72 : curved ? 0.16 : 0.22
  const sparksVisible = motion && !muted

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={selected ? 1.7 : 0.9}
        transparent
        opacity={opacity}
        depthWrite={false}
      />

      {sparksVisible ? (
        <>
          <ConnectionSpark
            path={path}
            color={color}
            offset={spark.offset}
            speed={spark.speed}
            size={selected ? 0.052 : 0.032}
            selected={selected}
            visible
          />
          {selected ? (
            <ConnectionSpark
              path={path}
              color={color}
              offset={spark.secondOffset}
              speed={spark.speed * 0.82}
              size={0.038}
              selected
              visible
            />
          ) : null}
        </>
      ) : null}
    </group>
  )
}

export function ConnectionLines({
  edges,
  nodesById,
  positions,
  selectedId,
  mode,
  motion,
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
            motion={motion}
          />
        )
      })}
    </group>
  )
}
