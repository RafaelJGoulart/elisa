import type { NodeShape } from '@/types/universe'

interface NodeGeometryProps {
  shape: NodeShape
  radius: number
}

export function NodeGeometry({ shape, radius }: NodeGeometryProps) {
  if (shape === 'icosahedron') return <icosahedronGeometry args={[radius, 1]} />
  if (shape === 'octahedron') return <octahedronGeometry args={[radius * 1.08, 0]} />
  if (shape === 'tetrahedron') return <tetrahedronGeometry args={[radius * 1.12, 0]} />
  if (shape === 'dodecahedron') return <dodecahedronGeometry args={[radius * 0.98, 0]} />
  if (shape === 'torus') {
    return <torusGeometry args={[radius * 0.82, radius * 0.3, 12, 26]} />
  }
  return <sphereGeometry args={[radius, 22, 22]} />
}
