import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { HoverHandler } from '@/types/universe'
import { getGlowTexture } from './glowTexture'

interface CoreOrbProps {
  motion: boolean
  onHover: HoverHandler
}

export function CoreOrb({ motion, onHover }: CoreOrbProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const glowTexture = useMemo(() => getGlowTexture(), [])

  useFrame((_, delta) => {
    if (!motion) return
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.08
    if (ringsRef.current) {
      ringsRef.current.rotation.y -= delta * 0.04
      ringsRef.current.rotation.x += delta * 0.018
    }
  })

  return (
    <group>
      <sprite scale={[3.6, 3.6, 1]} renderOrder={-1} raycast={() => null}>
        <spriteMaterial
          map={glowTexture}
          color="#8ee3ff"
          transparent
          opacity={0.46}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </sprite>

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.34, 32, 32]} />
          <meshStandardMaterial
            color="#e8fbff"
            emissive="#79d6ff"
            emissiveIntensity={2.4}
            roughness={0.2}
            toneMapped={false}
          />
        </mesh>
        <mesh
          scale={2.1}
          onPointerOver={(event) => {
            event.stopPropagation()
            onHover(
              { title: 'Elisa', color: '#8fe0e4', kind: 'Núcleo' },
              { x: event.clientX, y: event.clientY },
            )
          }}
          onPointerOut={() => onHover(null)}
        >
          <sphereGeometry args={[0.34, 18, 18]} />
          <meshBasicMaterial
            color="#80d4ff"
            transparent
            opacity={0.055}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[1.15, 0.006, 8, 96]} />
          <meshBasicMaterial color="#7ec8ef" transparent opacity={0.45} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 1.7, -0.5, 0.4]}>
          <torusGeometry args={[1.55, 0.005, 8, 96]} />
          <meshBasicMaterial color="#7e9dec" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      </group>

      <pointLight color="#9ce2ff" intensity={2.6} distance={16} decay={2} />
    </group>
  )
}
