import { Link } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
        <Icon name="compass" size={20} />
      </span>
      <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        O endereço acessado não existe na Elisa. Volte ao início para continuar.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/">
          <Icon name="home" size={14} />
          Voltar ao início
        </Link>
      </Button>
    </div>
  )
}
