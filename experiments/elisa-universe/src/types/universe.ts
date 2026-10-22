export type CategoryKey =
  | 'projects'
  | 'reading'
  | 'habits'
  | 'goals'
  | 'notes'
  | 'achievements'

export type NodeShape =
  | 'icosahedron'
  | 'octahedron'
  | 'sphere'
  | 'tetrahedron'
  | 'dodecahedron'
  | 'torus'

export type RelationKind = 'supports' | 'references' | 'inspires' | 'ritual'

export type ViewMode = 'spatial' | 'regions' | 'planar'

export interface CategoryMeta {
  key: CategoryKey
  label: string
  singular: string
  color: string
  softColor: string
  shape: NodeShape
  description: string
}

export interface UniverseNode {
  id: string
  title: string
  category: CategoryKey
  summary: string
  detail: string
  tags: string[]
  date: string
  weight: number
}

export interface UniverseEdge {
  id: string
  source: string
  target: string
  kind: RelationKind
  label: string
}

export interface UniverseDataset {
  name: string
  tagline: string
  nodes: UniverseNode[]
  edges: UniverseEdge[]
}
