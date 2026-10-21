import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { Icon } from '@/components/shared/Icon'
import {
  ToastContext,
  type ToastInput,
  type ToastVariant,
} from '@/components/shared/toast-context'
import { cn } from '@/lib/utils'

interface ToastItem extends ToastInput {
  id: number
  variant: ToastVariant
}

const VARIANT_STYLES: Record<ToastVariant, { icon: string; accent: string }> = {
  success: { icon: 'check-circle', accent: 'text-green' },
  error: { icon: 'alert-circle', accent: 'text-red' },
  info: { icon: 'info', accent: 'text-blue' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current
      nextId.current += 1
      const item: ToastItem = { ...input, id, variant: input.variant ?? 'info' }
      setToasts((current) => [...current, item])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {toasts.map((item) => {
          const styles = VARIANT_STYLES[item.variant]
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto w-full max-w-sm rounded-lg border border-border bg-surface-raised p-4 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2"
            >
              <div className="flex items-start gap-3">
                <Icon
                  name={styles.icon}
                  size={18}
                  className={cn('mt-0.5', styles.accent)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded p-0.5 text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Fechar aviso"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
