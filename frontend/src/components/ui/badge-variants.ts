import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-border bg-surface-raised text-text-secondary',
        outline: 'border-border text-text-secondary',
        success: 'border-transparent bg-green/10 text-green',
        warning: 'border-transparent bg-yellow/10 text-yellow',
        danger: 'border-transparent bg-red/10 text-red',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)
