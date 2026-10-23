import { describe, expect, it } from 'vitest'
import { MOCK_UNIVERSE } from '@/data/mockUniverse'
import {
  PLANAR_SIZE,
  REGION_RADIUS,
  SPATIAL_RADIUS,
  buildDegreeMap,
  buildGraphPositions,
  buildPlanarPositions,
  buildStarfield,
  getConnectedEdges,
  getConnectedNodeIds,
  getRegionAnchor,
  getSpatialAnchor,
} from '@/lib/layout'

function distance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

describe('buildGraphPositions', () => {
  it('posiciona todos os registros nos dois modos 3D', () => {
    for (const mode of ['spatial', 'regions'] as const) {
      const positions = buildGraphPositions(MOCK_UNIVERSE, mode)
      expect(positions.size).toBe(MOCK_UNIVERSE.nodes.length)
      expect([...positions.keys()].sort()).toEqual(
        MOCK_UNIVERSE.nodes.map((node) => node.id).sort(),
      )
    }
  })

  it('é determinístico para o mesmo conjunto', () => {
    const first = buildGraphPositions(MOCK_UNIVERSE, 'regions')
    const second = buildGraphPositions(MOCK_UNIVERSE, 'regions')
    expect([...second.entries()]).toEqual([...first.entries()])
  })

  it('mantém cada nó próximo à âncora da sua categoria', () => {
    for (const mode of ['spatial', 'regions'] as const) {
      const positions = buildGraphPositions(MOCK_UNIVERSE, mode)
      const radius = mode === 'regions' ? REGION_RADIUS : SPATIAL_RADIUS
      for (const node of MOCK_UNIVERSE.nodes) {
        const anchor =
          mode === 'regions' ? getRegionAnchor(node.category) : getSpatialAnchor(node.category)
        const position = positions.get(node.id)
        expect(position).toBeDefined()
        expect(distance(position!, anchor)).toBeLessThanOrEqual(radius + 0.2)
      }
    }
  })

  it('não coloca duas categorias na mesma âncora', () => {
    const unique = new Set<string>()
    for (const node of MOCK_UNIVERSE.nodes) {
      unique.add(getRegionAnchor(node.category).join(','))
    }
    expect(unique.size).toBe(6)
  })
})

describe('buildPlanarPositions', () => {
  it('mantém todos os nós dentro da área do grafo 2D', () => {
    const positions = buildPlanarPositions(MOCK_UNIVERSE)
    expect(positions.size).toBe(MOCK_UNIVERSE.nodes.length)
    for (const position of positions.values()) {
      expect(position.x).toBeGreaterThan(0)
      expect(position.x).toBeLessThan(PLANAR_SIZE.width)
      expect(position.y).toBeGreaterThan(0)
      expect(position.y).toBeLessThan(PLANAR_SIZE.height)
    }
  })
})

describe('conexões', () => {
  it('calcula grau e vizinhos dos dois lados da aresta', () => {
    const degrees = buildDegreeMap(MOCK_UNIVERSE.edges)
    const atlas = MOCK_UNIVERSE.nodes.find((node) => node.id === 'project-atlas')
    expect(atlas).toBeDefined()
    expect(degrees.get('project-atlas')).toBe(6)
    expect(getConnectedNodeIds('project-atlas', MOCK_UNIVERSE.edges).size).toBe(6)
    expect(getConnectedEdges('project-atlas', MOCK_UNIVERSE.edges)).toHaveLength(6)
    expect([...getConnectedNodeIds('note-pergunta', MOCK_UNIVERSE.edges)]).toEqual([])
  })
})

describe('buildStarfield', () => {
  it('gera posições determinísticas dentro da faixa esperada', () => {
    const first = buildStarfield(32, 7)
    const second = buildStarfield(32, 7)
    expect(first).toEqual(second)
    expect(first).toHaveLength(96)
    for (let index = 0; index < 32; index += 1) {
      const radius = Math.hypot(
        first[index * 3],
        first[index * 3 + 1],
        first[index * 3 + 2],
      )
      expect(radius).toBeGreaterThanOrEqual(22)
      expect(radius).toBeLessThanOrEqual(58)
    }
  })
})
