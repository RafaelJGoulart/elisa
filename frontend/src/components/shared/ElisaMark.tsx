import mark from '@/brand/mark.json'

interface ElisaMarkProps {
  size?: number
  className?: string
}

/**
 * Marca da Elisa: triângulo do Feather Icons.
 * A geometria vive em `src/brand/mark.json` e é compartilhada com os
 * arquivos gerados por `scripts/generate_brand_assets.py`.
 */
export function ElisaMark({ size = 26, className }: ElisaMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={mark.viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={mark.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={mark.triangle} />
    </svg>
  )
}
