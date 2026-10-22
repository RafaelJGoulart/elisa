import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CATEGORY_META } from '@/data/categories'
import { getNodeRadius, type Point3 } from '@/lib/layout'
import type { UniverseNode } from '@/types/universe'
import { NodeGeometry } from './NodeGeometry'

interface NodeOrbProps {
  node: UniverseNode
  position: Point3
  selected: boolean
  dimmed: boolean
  motion: boolean
  onSelect: (nodeId: string) => void
}

export function NodeOrb({ node, position, selected, dimmed, motion, onSelect }: NodeOrbProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const meta = CATEGORY_META[node.category]
  const radius = getNodeRadius(node)

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
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect(node.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
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
