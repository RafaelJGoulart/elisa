import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildStarfield } from '@/lib/layout'

interface StarfieldProps {
  motion: boolean
  count?: number
}

export function Starfield({ motion, count = 900 }: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => buildStarfield(count), [count])

  useFrame((_, delta) => {
    if (!motion || !pointsRef.current) return
    pointsRef.current.rotation.y += delta * 0.006
    pointsRef.current.rotation.x += delta * 0.0015
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a9c2df"
        size={0.048}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
