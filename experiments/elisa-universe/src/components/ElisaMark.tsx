interface ElisaMarkProps {
  size?: number
  className?: string
}

/**
 * Marca da Elisa: o triângulo do Feather Icons, apenas com traço.
 * Reproduz a geometria de `frontend/src/brand/mark.json` sem criar
 * dependência entre o laboratório e a aplicação principal.
 */
export function ElisaMark({ size = 26, className }: ElisaMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
}
