import { useEffect } from 'react'

/**
 * Pede confirmação ao navegador antes de fechar ou recarregar a página
 * enquanto houver conteúdo não salvo. Não substitui o diálogo de descarte
 * dentro do aplicativo — cobre apenas a saída abrupta do navegador.
 */
export function useUnsavedChangesWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [active])
}
