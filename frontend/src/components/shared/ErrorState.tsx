import { Icon } from '@/components/shared/Icon'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  headingLevel?: 'h1' | 'h2'
}

export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  headingLevel = 'h2',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-red/25 bg-red/5 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Icon name="alert-circle" size={20} className="mt-0.5 text-red" />
        <div>
          {headingLevel === 'h1' ? (
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
          ) : (
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
          )}
          <p className="mt-1 text-sm text-text-secondary">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icon name="refresh-cw" size={14} />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
