import { useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { ElisaMark } from '@/components/shared/ElisaMark'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { cn } from '@/lib/utils'
import { systemService } from '@/services/system'

interface NavItem {
  label: string
  icon: string
  to?: string
  end?: boolean
  planned?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: 'home', to: '/', end: true },
  { label: 'Atividades', icon: 'activity', to: '/atividades' },
  { label: 'Diário', icon: 'feather', to: '/diario' },
  { label: 'Mídia', icon: 'film', to: '/midia' },
  { label: 'Conhecimento', icon: 'book-open', planned: true },
  { label: 'Projetos', icon: 'folder', planned: true },
  { label: 'IA', icon: 'cpu', planned: true },
]

function HealthIndicator() {
  const loadHealth = useCallback((signal: AbortSignal) => systemService.health(signal), [])
  const { data, loading, error } = useAsyncResource(loadHealth, [])

  const isOnline = Boolean(data) && !error
  const label = loading ? 'Verificando…' : isOnline ? 'Local · SQLite' : 'Servidor offline'
  const detail = loading
    ? 'Conectando ao servidor local da Elisa.'
    : isOnline
      ? `Servidor local ativo. Banco de dados: ${data?.database ?? 'ok'}.`
      : 'O servidor Flask não respondeu. Inicie o backend para acessar seus dados.'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex cursor-default items-center gap-2 text-[11px] text-text-secondary"
          tabIndex={0}
          aria-label={detail}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              loading && 'bg-text-disabled',
              !loading && isOnline && 'bg-green',
              !loading && !isOnline && 'bg-red',
            )}
            aria-hidden="true"
          />
          {label}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56">
        {detail}
      </TooltipContent>
    </Tooltip>
  )
}

function DesktopNav() {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        if (item.planned || !item.to) {
          return (
            <div
              key={item.label}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-disabled"
              title="Módulo planejado, ainda não implementado."
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1">{item.label}</span>
              <span className="text-[10px] tracking-wide text-text-disabled uppercase">
                em breve
              </span>
            </div>
          )
        }

        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-surface-raised font-medium text-foreground'
                  : 'text-text-secondary hover:bg-surface hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span
                    className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                ) : null}
                <Icon
                  name={item.icon}
                  size={16}
                  className={isActive ? 'text-primary' : undefined}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  return (
    <div className="min-h-svh bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface/40 lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <ElisaMark className="text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-foreground">Elisa</p>
            <p className="text-[11px] text-text-secondary">ambiente pessoal</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-medium tracking-[0.16em] text-text-secondary uppercase">
            Espaço
          </p>
          <DesktopNav />
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <HealthIndicator />
          <p className="text-[11px] text-text-secondary">v0.2.0 · dados na sua máquina</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm lg:hidden">
        <NavLink to="/" className="flex items-center gap-2.5">
          <ElisaMark size={24} className="text-primary" />
          <span className="text-sm font-semibold tracking-tight text-foreground">Elisa</span>
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md border border-border p-2 text-text-secondary transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Abrir menu de navegação"
            >
              <Icon name="menu" size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Navegação</DropdownMenuLabel>
            {NAV_ITEMS.map((item) => {
              if (item.planned || !item.to) {
                return (
                  <DropdownMenuItem key={item.label} disabled>
                    <Icon name={item.icon} size={15} />
                    <span className="flex-1">{item.label}</span>
                    <Badge variant="outline" className="text-[9px]">
                      em breve
                    </Badge>
                  </DropdownMenuItem>
                )
              }

              return (
                <DropdownMenuItem key={item.label} asChild>
                  <NavLink to={item.to} end={item.end} className="flex items-center gap-2">
                    <Icon name={item.icon} size={15} />
                    {item.label}
                  </NavLink>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <HealthIndicator />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main id="conteudo" className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-12 lg:pb-[calc(3rem+env(safe-area-inset-bottom))]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
