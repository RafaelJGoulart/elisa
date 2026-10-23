import { describe, expect, it } from 'vitest'
import type { CategoryKey, UniverseEdge, UniverseNode } from '@/types/universe'
import {
  filterEdges,
  filterNodes,
  nodeMatchesQuery,
  normalizeSearch,
} from '@/lib/universe'

const categories = new Set<CategoryKey>(['projects', 'notes'])

const nodes: UniverseNode[] = [
  {
    id: 'project-atlas',
    title: 'Atlas de bolso',
    category: 'projects',
    summary: 'Mapas afetivos.',
    detail: 'Detalhe sobre cartografia.',
    tags: ['memória', 'mapa'],
    date: '2026-10-12',
    weight: 3,
  },
  {
    id: 'note-estufa',
    title: 'Estufa lunar',
    category: 'notes',
    summary: 'Luz emprestada.',
    detail: 'Anotação sobre botânica.',
    tags: ['ficção'],
    date: '2026-10-11',
    weight: 1,
  },
  {
    id: 'note-pergunta',
    title: 'O que permanece?',
    category: 'notes',
    summary: 'Pergunta aberta.',
    detail: 'Sem conexões.',
    tags: ['tempo'],
    date: '2026-10-20',
    weight: 1,
  },
]

const edges: UniverseEdge[] = [
  {
    id: 'edge-01',
    source: 'project-atlas',
    target: 'note-estufa',
    kind: 'inspires',
    label: 'atmosfera',
  },
  {
    id: 'edge-02',
    source: 'project-atlas',
    target: 'note-pergunta',
    kind: 'supports',
    label: 'pergunta',
  },
]

describe('normalizeSearch', () => {
  it('remove acentos e normaliza caixa e espaços', () => {
    expect(normalizeSearch('  ÓRBITA  ')).toBe('orbita')
    expect(normalizeSearch('Memória')).toBe('memoria')
  })
})

describe('nodeMatchesQuery', () => {
  it('aceita consulta vazia', () => {
    expect(nodeMatchesQuery(nodes[0], '   ')).toBe(true)
  })

  it('busca em título, resumo, detalhe e etiquetas sem acento', () => {
    expect(nodeMatchesQuery(nodes[0], 'atlas')).toBe(true)
    expect(nodeMatchesQuery(nodes[1], 'botanica')).toBe(true)
    expect(nodeMatchesQuery(nodes[0], 'memoria')).toBe(true)
    expect(nodeMatchesQuery(nodes[2], 'estufa')).toBe(false)
  })
})

describe('filterNodes', () => {
  it('combina categoria ativa e busca', () => {
    expect(filterNodes(nodes, categories, '')).toHaveLength(3)
    expect(filterNodes(nodes, new Set<CategoryKey>(['notes']), '')).toHaveLength(2)
    expect(filterNodes(nodes, categories, 'estufa').map((node) => node.id)).toEqual([
      'note-estufa',
    ])
  })

  it('retorna vazio quando nenhuma categoria está ativa', () => {
    expect(filterNodes(nodes, new Set<CategoryKey>(), '')).toEqual([])
  })

  it('retorna vazio quando a busca não encontra registros', () => {
    expect(filterNodes(nodes, categories, 'inexistente')).toEqual([])
  })
})

describe('filterEdges', () => {
  it('mantém apenas conexões com os dois extremos visíveis', () => {
    expect(filterEdges(edges, new Set(['project-atlas', 'note-estufa']))).toEqual([edges[0]])
    expect(filterEdges(edges, new Set(['project-atlas']))).toEqual([])
    expect(filterEdges(edges, new Set())).toEqual([])
  })
})
