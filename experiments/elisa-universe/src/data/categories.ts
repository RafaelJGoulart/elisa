import type { CategoryKey, CategoryMeta } from '@/types/universe'

export const CATEGORY_ORDER: CategoryKey[] = [
  'projects',
  'reading',
  'habits',
  'goals',
  'notes',
  'achievements',
]

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  projects: {
    key: 'projects',
    label: 'Projetos',
    singular: 'Projeto',
    color: '#7de3d0',
    softColor: 'rgba(125, 227, 208, 0.14)',
    shape: 'icosahedron',
    description: 'Coisas que estão sendo construídas.',
  },
  reading: {
    key: 'reading',
    label: 'Leituras',
    singular: 'Leitura',
    color: '#f3c77b',
    softColor: 'rgba(243, 199, 123, 0.14)',
    shape: 'octahedron',
    description: 'Textos que deixaram marcas.',
  },
  habits: {
    key: 'habits',
    label: 'Hábitos',
    singular: 'Hábito',
    color: '#9bd67c',
    softColor: 'rgba(155, 214, 124, 0.14)',
    shape: 'sphere',
    description: 'Práticas que voltam todo dia.',
  },
  goals: {
    key: 'goals',
    label: 'Objetivos',
    singular: 'Objetivo',
    color: '#a9a4ff',
    softColor: 'rgba(169, 164, 255, 0.14)',
    shape: 'tetrahedron',
    description: 'Direções que orientam a órbita.',
  },
  notes: {
    key: 'notes',
    label: 'Anotações',
    singular: 'Anotação',
    color: '#7eb8f7',
    softColor: 'rgba(126, 184, 247, 0.14)',
    shape: 'dodecahedron',
    description: 'Fragmentos ainda em aberto.',
  },
  achievements: {
    key: 'achievements',
    label: 'Conquistas',
    singular: 'Conquista',
    color: '#f28fae',
    softColor: 'rgba(242, 143, 174, 0.14)',
    shape: 'torus',
    description: 'Marcos que mudaram a escala.',
  },
}

export const RELATION_LABELS = {
  supports: 'sustenta',
  references: 'referencia',
  inspires: 'inspira',
  ritual: 'ritualiza',
} as const
