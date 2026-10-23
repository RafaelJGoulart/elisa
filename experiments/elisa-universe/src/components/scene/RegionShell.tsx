import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { CATEGORY_META } from '@/data/categories'
import type { Point3 } from '@/lib/layout'
import type { CategoryKey } from '@/types/universe'

interface RegionShellProps {
  category: CategoryKey
  anchor: Point3
  nodeCount: number
}

interface LabelTexture {
  texture: THREE.CanvasTexture
  aspect: number
}

function buildLabelTexture(category: CategoryKey, nodeCount: number): LabelTexture {
  const meta = CATEGORY_META[category]
  const count = String(nodeCount)
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')
  const labelFont = '500 52px "Segoe UI", system-ui, sans-serif'
  const countFont = '500 34px "Cascadia Code", Consolas, monospace'

  if (!measure) {
    const texture = new THREE.CanvasTexture(canvas)
    return { texture, aspect: 1 }
  }

  measure.font = labelFont
  const labelWidth = measure.measureText(meta.label).width
  measure.font = countFont
  const countWidth = measure.measureText(count).width

  const height = 112
  const padding = 24
  const dotSize = 20
  const gap = 14
  const width = Math.ceil(
    padding * 2 + dotSize + gap + labelWidth + gap + countWidth,
  )

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (context) {
    context.clearRect(0, 0, width, height)
    context.fillStyle = 'rgba(5, 9, 16, 0.84)'
    context.beginPath()
    context.roundRect(2, 2, width - 4, height - 4, height / 2)
    context.fill()
    context.strokeStyle = 'rgba(197, 224, 245, 0.24)'
    context.lineWidth = 3
    context.stroke()

    const centerY = height / 2
    const dotX = padding + dotSize / 2

    context.save()
    context.shadowColor = meta.color
    context.shadowBlur = 18
    context.fillStyle = meta.color
    context.beginPath()
    context.arc(dotX, centerY + 1, dotSize / 2, 0, Math.PI * 2)
    context.fill()
    context.restore()

    context.textBaseline = 'middle'
    context.font = labelFont
    context.fillStyle = '#edf5ff'
    const labelX = padding + dotSize + gap
    context.fillText(meta.label, labelX, centerY + 1)

    context.font = countFont
    context.fillStyle = '#8da3bb'
    context.fillText(count, labelX + labelWidth + gap, centerY + 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return { texture, aspect: width / height }
}

export function RegionShell({ category, anchor, nodeCount }: RegionShellProps) {
  const meta = CATEGORY_META[category]
  const size = useThree((state) => state.size)
  const compact = size.width / Math.max(1, size.height) < 1.1
  const labelScale = compact ? 0.56 : 0.62
  const labelOffset = compact ? 3.02 : 3.35
  const label = useMemo(
    () => buildLabelTexture(category, nodeCount),
    [category, nodeCount],
  )

  useEffect(() => () => label.texture.dispose(), [label])

  return (
    <group position={anchor}>
      <mesh>
        <sphereGeometry args={[2.95, 22, 22]} />
        <meshBasicMaterial
          color={meta.color}
          wireframe
          transparent
          opacity={0.045}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.9, 22, 22]} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={0.018}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0.1]}>
        <torusGeometry args={[2.52, 0.006, 8, 84]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2.8, 0.45, 0]}>
        <torusGeometry args={[2.18, 0.004, 8, 84]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <sprite
        position={[0, category === 'projects' ? -labelOffset : labelOffset, 0]}
        scale={[labelScale * label.aspect, labelScale, 1]}
        renderOrder={10}
      >
        <spriteMaterial
          map={label.texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  )
}
