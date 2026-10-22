import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { ViewMode } from '@/types/universe'

interface CameraRigProps {
  mode: Exclude<ViewMode, 'planar'>
  resetToken: number
  motion: boolean
}

const CAMERA_BASE = {
  spatial: { position: [0, 0, 1] as const, radius: 7.2 },
  regions: { position: [0, 3, 19] as const, radius: 10.2 },
}

export function CameraRig({ mode, resetToken, motion }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)

  const home = useMemo(() => {
    const base = CAMERA_BASE[mode]
    const [x, y, z] = base.position
    const length = Math.hypot(x, y, z)
    const halfFov = Math.tan((48 * Math.PI) / 360)
    const aspect = size.width / Math.max(1, size.height)
    const narrow = aspect < 0.9
    const overviewLimit = mode === 'regions' ? (narrow ? 30 : 46) : narrow ? 24 : 36
    const distance = Math.min(
      overviewLimit,
      Math.max(6, (base.radius / (halfFov * Math.min(1, aspect))) * 1.06),
    )
    return {
      position: [
        (x / length) * distance,
        (y / length) * distance,
        (z / length) * distance,
      ] as [number, number, number],
      target: [0, 0, 0] as const,
    }
  }, [mode, size.height, size.width])

  useEffect(() => {
    camera.position.set(home.position[0], home.position[1], home.position[2])
    controlsRef.current?.target.set(home.target[0], home.target[1], home.target[2])
    controlsRef.current?.update()
  }, [camera, home.position, home.target, resetToken])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={motion}
      dampingFactor={0.06}
      enablePan
      minDistance={6}
      maxDistance={60}
      autoRotate={mode === 'regions' && motion}
      autoRotateSpeed={0.26}
      rotateSpeed={0.55}
      zoomSpeed={0.75}
      panSpeed={0.6}
    />
  )
}
