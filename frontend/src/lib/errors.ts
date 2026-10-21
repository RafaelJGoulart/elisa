export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Algo não saiu como esperado. Tente novamente.'
}
