import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { TodayList } from '@/features/activities/components/TodayList'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia.'
  if (hour < 18) return 'Boa tarde.'
  return 'Boa noite.'
}

export function HomePage() {
  const [now] = useState(() => new Date())

  return (
    <div className="space-y-10">
      <section>
        <p className="text-[11px] font-medium tracking-[0.14em] text-text-secondary uppercase">
          {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {greeting()}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
          Este é o seu espaço. Veja o que está acontecendo hoje e cuide do que importa com
          calma.
        </p>
      </section>

      <section aria-labelledby="today-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="today-title" className="text-sm font-semibold text-foreground">
              Hoje
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Registre o que você concluiu. Você pode desfazer a qualquer momento.
            </p>
          </div>
          <Link
            to="/atividades"
            className="shrink-0 text-xs text-text-secondary transition-colors hover:text-foreground"
          >
            Ver atividades
          </Link>
        </div>
        <TodayList />
      </section>

      <footer className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 px-5 py-4">
        <Icon name="database" size={16} className="mt-0.5 text-text-disabled" />
        <p className="text-xs leading-relaxed text-text-secondary">
          <span className="font-medium text-foreground">Local-first.</span> Seus dados ficam
          neste computador: registros do Diário em Markdown e o restante em SQLite. Nenhum
          serviço externo está conectado nesta versão.
        </p>
      </footer>
    </div>
  )
}
