import type {
  CategoryKey,
  UniverseEdge,
  UniverseNode,
} from '@/types/universe'

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function nodeMatchesQuery(node: UniverseNode, query: string): boolean {
  const search = normalizeSearch(query)
  if (!search) return true
  const haystack = normalizeSearch(
    [node.title, node.summary, node.detail, node.tags.join(' ')].join(' '),
  )
  return haystack.includes(search)
}

export function filterNodes(
  nodes: UniverseNode[],
  activeCategories: ReadonlySet<CategoryKey>,
  query: string,
): UniverseNode[] {
  return nodes.filter(
    (node) => activeCategories.has(node.category) && nodeMatchesQuery(node, query),
  )
}

export function filterEdges(
  edges: UniverseEdge[],
  visibleNodeIds: ReadonlySet<string>,
): UniverseEdge[] {
  return edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  )
}
