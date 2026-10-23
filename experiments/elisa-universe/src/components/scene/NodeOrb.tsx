import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_META } from '@/data/categories'
import { getNodeRadius, type Point3 } from '@/lib/layout'
import type { HoverHandler, UniverseNode } from '@/types/universe'
import { NodeGeometry } from './NodeGeometry'
import { getGlowTexture } from './glowTexture'

interface NodeOrbProps {
  node: UniverseNode
  position: Point3
  selected: boolean
  dimmed: boolean
  motion: boolean
  onSelect: (nodeId: string) => void
  onHover: HoverHandler
}

export function NodeOrb({
  node,
  position,
  selected,
  dimmed,
  motion,
  onSelect,
  onHover,
}: NodeOrbProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const meta = CATEGORY_META[node.category]
  const radius = getNodeRadius(node)
  const glowTexture = useMemo(() => getGlowTexture(), [])
  const glowScale = radius * (selected ? 8.4 : hovered ? 7.2 : 6)

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const target = selected ? 1.38 : hovered ? 1.16 : 1
    const pulse = selected && motion ? Math.sin(clock.elapsedTime * 2.2) * 0.05 : 0
    groupRef.current.scale.setScalar(target + pulse)
  })

  return (
    <group ref={groupRef} position={position}>
      <sprite
        scale={[glowScale, glowScale, 1]}
        renderOrder={-1}
        raycast={() => null}
      >
        <spriteMaterial
          map={glowTexture}
          color={meta.color}
          transparent
          opacity={dimmed ? 0.04 : selected ? 0.52 : hovered ? 0.38 : 0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </sprite>

      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect(node.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          onHover(
            { title: node.title, color: meta.color, kind: meta.singular },
            { x: event.clientX, y: event.clientY },
          )
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          onHover(null)
          document.body.style.cursor = ''
        }}
      >
        <NodeGeometry shape={meta.shape} radius={radius} />
        <meshStandardMaterial
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={selected ? 1.25 : hovered ? 0.8 : 0.5}
          roughness={0.35}
          metalness={0.12}
          transparent
          opacity={dimmed ? 0.26 : 1}
        />
      </mesh>

      <mesh scale={1.7} raycast={() => null}>
        <NodeGeometry shape={meta.shape} radius={radius} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={dimmed ? 0.015 : selected ? 0.17 : hovered ? 0.1 : 0.055}
          depthWrite={false}
        />
      </mesh>

      {selected ? <pointLight color={meta.color} intensity={2.1} distance={3.2} /> : null}
    </group>
  )
}
