import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { Button } from '@/components/ui/button'

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return 'A página acessada não existe nesta versão da Elisa.'
    return `O servidor respondeu com o erro ${error.status}.`
  }
  if (error instanceof Error && error.message) return error.message
  return 'Algo inesperado aconteceu ao montar esta tela.'
}

export function RouteErrorPage() {
  const error = useRouteError()

  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-full border border-red/25 bg-red/5 text-red">
        <Icon name="alert-circle" size={20} />
      </span>
      <h1 className="text-xl font-semibold text-foreground">Não foi possível abrir esta tela</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        {errorMessage(error)}
      </p>
      <Button asChild variant="outline" className="mt-5">
        <a href="/">
          <Icon name="home" size={14} />
          Voltar ao início
        </a>
      </Button>
    </div>
  )
}
