import type { ViewMode } from '@/types/universe'

export interface ModeMeta {
  id: ViewMode
  letter: string
  label: string
  description: string
}

export const MODES: ModeMeta[] = [
  {
    id: 'spatial',
    letter: 'A',
    label: 'Grafo espacial',
    description: 'Nós e conexões em um espaço aberto. Arraste para orbitar e clique em um ponto para ler.',
  },
  {
    id: 'regions',
    letter: 'B',
    label: 'Universo com ambientes',
    description: 'Seis regiões atmosféricas, cada uma com sua própria órbita e pequena coleção de registros.',
  },
  {
    id: 'planar',
    letter: 'C',
    label: 'Grafo 2D',
    description: 'A mesma rede em uma superfície plana, para comparar legibilidade e navegação.',
  },
]

export function getModeMeta(mode: ViewMode): ModeMeta {
  return MODES.find((item) => item.id === mode) ?? MODES[0]!
}
