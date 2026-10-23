import * as THREE from 'three'

let glowTexture: THREE.CanvasTexture | null = null

/**
 * Textura radial compartilhada para halos aditivos. É criada uma única vez e
 * reutilizada por todos os astros, evitando uma textura por nó.
 */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.72)')
    gradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.22)')
    gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.05)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  }

  glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  glowTexture.minFilter = THREE.LinearFilter
  glowTexture.magFilter = THREE.LinearFilter
  return glowTexture
}
