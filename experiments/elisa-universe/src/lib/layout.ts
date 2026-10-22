import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories'
import type {
  CategoryKey,
  UniverseDataset,
  UniverseEdge,
  UniverseNode,
  ViewMode,
} from '@/types/universe'
import { hashString, mulberry32 } from '@/lib/random'

export type Point3 = [number, number, number]
export type Point2 = { x: number; y: number }

const SPATIAL_ANCHORS: Record<CategoryKey, Point3> = {
  projects: [-4.4, 1.1, 0.2],
  reading: [4.2, 2.2, -0.6],
  habits: [-1.2, -3.0, 2.0],
  goals: [1.7, 3.2, 2.4],
  notes: [4.5, -1.4, 2.4],
  achievements: [-4.6, -2.3, -2.4],
}

const REGION_ANCHORS: Record<CategoryKey, Point3> = {
  projects: [-6.2, 0.9, -1.8],
  reading: [6.1, 1.4, -1.4],
  habits: [-3.2, -2.9, 4.2],
  goals: [3.5, 3.0, 4.4],
  notes: [-6.0, -2.8, 3.2],
  achievements: [5.9, -2.7, 3.4],
}

export const REGION_RADIUS = 2.35
export const SPATIAL_RADIUS = 1.7
export const PLANAR_SIZE = { width: 1000, height: 720 }

export function getRegionAnchor(category: CategoryKey): Point3 {
  return REGION_ANCHORS[category]
}

export function getSpatialAnchor(category: CategoryKey): Point3 {
  return SPATIAL_ANCHORS[category]
}

function fibonacciSphere(index: number, count: number, radius: number): Point3 {
  const y = 1 - ((index + 0.5) * 2) / count
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5)
  return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius]
}

function positionForNode(
  node: UniverseNode,
  index: number,
  count: number,
  anchor: Point3,
  radius: number,
): Point3 {
  const base = fibonacciSphere(index, count, radius)
  const random = mulberry32(hashString(node.id))
  const jitter = 0.18
  return [
    anchor[0] + base[0] + (random() - 0.5) * jitter,
    anchor[1] + base[1] + (random() - 0.5) * jitter,
    anchor[2] + base[2] + (random() - 0.5) * jitter,
  ]
}

export function buildGraphPositions(
  dataset: UniverseDataset,
  mode: Exclude<ViewMode, 'planar'>,
): Map<string, Point3> {
  const positions = new Map<string, Point3>()
  for (const category of CATEGORY_ORDER) {
    const nodes = dataset.nodes.filter((node) => node.category === category)
    const anchor = mode === 'regions' ? getRegionAnchor(category) : getSpatialAnchor(category)
    const radius = mode === 'regions' ? REGION_RADIUS : SPATIAL_RADIUS
    nodes.forEach((node, index) => {
      positions.set(node.id, positionForNode(node, index, nodes.length, anchor, radius))
    })
  }
  return positions
}

export function buildPlanarPositions(dataset: UniverseDataset): Map<string, Point2> {
  const positions = new Map<string, Point2>()
  const centerX = PLANAR_SIZE.width / 2
  const centerY = PLANAR_SIZE.height / 2

  CATEGORY_ORDER.forEach((category, categoryIndex) => {
    const angle = -Math.PI / 2 + (categoryIndex * Math.PI * 2) / CATEGORY_ORDER.length
    const categoryRadius = 230
    const categoryX = centerX + Math.cos(angle) * categoryRadius
    const categoryY = centerY + Math.sin(angle) * categoryRadius
    const nodes = dataset.nodes.filter((node) => node.category === category)
    const nodeRadius = 70

    nodes.forEach((node, index) => {
      const random = mulberry32(hashString(node.id))
      const nodeAngle = (index / nodes.length) * Math.PI * 2 + random() * 0.55
      positions.set(node.id, {
        x: categoryX + Math.cos(nodeAngle) * nodeRadius,
        y: categoryY + Math.sin(nodeAngle) * nodeRadius,
      })
    })
  })

  return positions
}

export function getPlanarCategoryCenter(category: CategoryKey): Point2 {
  const index = CATEGORY_ORDER.indexOf(category)
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / CATEGORY_ORDER.length
  return {
    x: PLANAR_SIZE.width / 2 + Math.cos(angle) * 230,
    y: PLANAR_SIZE.height / 2 + Math.sin(angle) * 230,
  }
}

export function buildDegreeMap(edges: UniverseEdge[]): Map<string, number> {
  const degrees = new Map<string, number>()
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
  }
  return degrees
}

export function getConnectedEdges(nodeId: string, edges: UniverseEdge[]): UniverseEdge[] {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId)
}

export function getConnectedNodeIds(nodeId: string, edges: UniverseEdge[]): Set<string> {
  const ids = new Set<string>()
  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target)
    if (edge.target === nodeId) ids.add(edge.source)
  }
  return ids
}

export function getNodeRadius(node: UniverseNode): number {
  return 0.12 + node.weight * 0.035
}

export function getPlanarNodeRadius(node: UniverseNode): number {
  return 8 + node.weight * 2.1
}

export function getCategoryColor(category: CategoryKey): string {
  return CATEGORY_META[category].color
}

export function buildStarfield(count: number, seed = 2417): Float32Array {
  const random = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 22 + random() * 36
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  return positions
}
