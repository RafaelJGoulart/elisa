import { clampPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MediaProgressBarProps {
  percent: number | null
  label: string
  className?: string
  color?: string
}

/** Barra de progresso acessível; 100% quando não há total conhecido. */
export function MediaProgressBar({
  percent,
  label,
  className,
  color,
}: MediaProgressBarProps) {
  const value = percent != null ? clampPercent(percent) : 100
  return (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full bg-surface-raised', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent != null ? Math.round(value) : undefined}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', !color && 'bg-primary')}
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}
