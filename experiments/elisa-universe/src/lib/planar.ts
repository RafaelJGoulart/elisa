import { hashString, seededBetween } from '@/lib/random'

/**
 * Equivalente lento da rotação automática do modo "Universo com ambientes".
 * OrbitControls usa 0.38 de velocidade; em 2D isso corresponde a uma volta
 * completa em aproximadamente 158 segundos.
 */
export const PLANAR_ORBIT_DURATION_SECONDS = 158

const SPARK_MIN_DURATION = 4.8
const SPARK_MAX_DURATION = 8.2

export interface PlanarEdgeMotion {
  duration: number
  offset: number
  secondOffset: number
}

/**
 * Gera tempos estáveis para as partículas de uma conexão. O mesmo grafo
 * produz sempre a mesma animação, mesmo depois de filtrar ou selecionar nós.
 */
export function getPlanarEdgeMotion(edgeId: string): PlanarEdgeMotion {
  const seed = hashString(edgeId)
  const duration = seededBetween(seed, SPARK_MIN_DURATION, SPARK_MAX_DURATION)

  return {
    duration,
    offset: seededBetween(seed + 13, 0, duration),
    secondOffset: seededBetween(seed + 29, duration * 0.18, duration * 0.82),
  }
}
