import { describe, expect, it } from 'vitest'
import { CATEGORY_META, CATEGORY_ORDER, RELATION_LABELS } from '@/data/categories'
import { MOCK_UNIVERSE } from '@/data/mockUniverse'
import type { CategoryKey, RelationKind } from '@/types/universe'

const categoryKeys = new Set(Object.keys(CATEGORY_META))
const relationKinds = new Set(Object.keys(RELATION_LABELS))

describe('conjunto fictício', () => {
  it('mantém as quantidades documentadas', () => {
    expect(MOCK_UNIVERSE.nodes).toHaveLength(24)
    expect(MOCK_UNIVERSE.edges).toHaveLength(26)
  })

  it('usa identificadores únicos', () => {
    expect(new Set(MOCK_UNIVERSE.nodes.map((node) => node.id)).size).toBe(
      MOCK_UNIVERSE.nodes.length,
    )
    expect(new Set(MOCK_UNIVERSE.edges.map((edge) => edge.id)).size).toBe(
      MOCK_UNIVERSE.edges.length,
    )
  })

  it('distribui quatro registros por categoria', () => {
    expect(CATEGORY_ORDER).toHaveLength(6)
    for (const category of CATEGORY_ORDER) {
      expect(MOCK_UNIVERSE.nodes.filter((node) => node.category === category)).toHaveLength(4)
    }
  })

  it('preenche campos obrigatórios e válidos', () => {
    for (const node of MOCK_UNIVERSE.nodes) {
      expect(node.title.trim()).not.toBe('')
      expect(node.summary.trim()).not.toBe('')
      expect(node.detail.trim()).not.toBe('')
      expect(node.tags.length).toBeGreaterThan(0)
      expect(categoryKeys.has(node.category)).toBe(true)
      expect(node.weight).toBeGreaterThan(0)
      expect(node.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(`${node.date}T12:00:00`))).toBe(false)
    }
  })

  it('conecta apenas registros existentes, sem laços ou arestas duplicadas', () => {
    const nodeIds = new Set(MOCK_UNIVERSE.nodes.map((node) => node.id))
    const pairs = new Set<string>()

    for (const edge of MOCK_UNIVERSE.edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
      expect(edge.source).not.toBe(edge.target)
      expect(edge.label.trim()).not.toBe('')
      expect(relationKinds.has(edge.kind)).toBe(true)

      const pair = [edge.source, edge.target].sort().join('::')
      expect(pairs.has(pair)).toBe(false)
      pairs.add(pair)
    }
  })

  it('mantém quatro registros isolados, como documentado', () => {
    const connected = new Set<string>()
    for (const edge of MOCK_UNIVERSE.edges) {
      connected.add(edge.source)
      connected.add(edge.target)
    }
    const isolated = MOCK_UNIVERSE.nodes
      .filter((node) => !connected.has(node.id))
      .map((node) => node.id)
      .sort()
    expect(isolated).toEqual([
      'achievement-horizonte',
      'goal-observatorios',
      'note-pergunta',
      'project-mares',
    ])
  })

  it('define metadados completos para todas as categorias e relações', () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_META[category].key).toBe(category)
      expect(CATEGORY_META[category].label.trim()).not.toBe('')
      expect(CATEGORY_META[category].color).toMatch(/^#[0-9a-f]{6}$/i)
    }
    const kinds: RelationKind[] = ['supports', 'references', 'inspires', 'ritual']
    for (const kind of kinds) {
      expect(RELATION_LABELS[kind].trim()).not.toBe('')
    }
    const categories = new Set<CategoryKey>(MOCK_UNIVERSE.nodes.map((node) => node.category))
    expect(categories.size).toBe(CATEGORY_ORDER.length)
  })
})
