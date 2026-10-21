import type { ReactNode } from 'react'

import { Icon, type IconName } from '@/components/shared/Icon'

interface EmptyStateProps {
  icon: IconName
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
        <Icon name={icon} size={20} />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
