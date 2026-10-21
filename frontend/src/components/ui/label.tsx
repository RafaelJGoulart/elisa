import * as LabelPrimitive from '@radix-ui/react-label'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-xs font-medium uppercase tracking-[0.08em] text-text-secondary select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
