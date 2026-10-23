import { describe, expect, it } from 'vitest'
import { PLANAR_ORBIT_DURATION_SECONDS, getPlanarEdgeMotion } from '@/lib/planar'

describe('getPlanarEdgeMotion', () => {
  it('é determinístico para a mesma conexão', () => {
    expect(getPlanarEdgeMotion('project-atlas::note-estufa')).toEqual(
      getPlanarEdgeMotion('project-atlas::note-estufa'),
    )
  })

  it('mantém duração e defasagens dentro da faixa esperada', () => {
    const motion = getPlanarEdgeMotion('habit-leitura::goal-observatorios')

    expect(motion.duration).toBeGreaterThanOrEqual(4.8)
    expect(motion.duration).toBeLessThanOrEqual(8.2)
    expect(motion.offset).toBeGreaterThanOrEqual(0)
    expect(motion.offset).toBeLessThanOrEqual(motion.duration)
    expect(motion.secondOffset).toBeGreaterThanOrEqual(motion.duration * 0.18)
    expect(motion.secondOffset).toBeLessThanOrEqual(motion.duration * 0.82)
    expect(PLANAR_ORBIT_DURATION_SECONDS).toBe(158)
  })
})
