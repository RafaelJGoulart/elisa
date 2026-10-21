import { useCallback, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { Badge } from '@/components/ui/badge'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { cn } from '@/lib/utils'
import { activitiesService } from '@/services/activities'
import { TodayList } from '@/features/activities/components/TodayList'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia.'
  if (hour < 18) return 'Boa tarde.'
  return 'Boa noite.'
}

interface ModuleCardProps {
  icon: string
  title: string
  description: string
  status: 'Ativo' | 'Planejado'
  meta: string
  to?: string
}

function ModuleCard({ icon, title, description, status, meta, to }: ModuleCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border border-border bg-surface-raised',
            status === 'Ativo' ? 'text-primary' : 'text-text-disabled',
          )}
        >
          <Icon name={icon} size={17} />
        </span>
        <Badge variant={status === 'Ativo' ? 'success' : 'outline'}>{status}</Badge>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{description}</p>
      <p className="mt-4 text-[11px] text-text-disabled">{meta}</p>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text-disabled/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className="flex flex-col rounded-xl border border-dashed border-border bg-surface/40 p-5"
      aria-label={`${title}: módulo planejado, ainda não implementado`}
    >
      {content}
    </div>
  )
}

export function HomePage() {
  const loadToday = useCallback((signal: AbortSignal) => activitiesService.today(signal), [])
  const { data } = useAsyncResource(loadToday, [])
  const activityCount = data?.activities.length ?? 0
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

      <section aria-labelledby="modules-title" className="space-y-3">
        <div>
          <h2 id="modules-title" className="text-sm font-semibold text-foreground">
            Módulos
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            A Elisa cresce por módulos independentes. O que ainda não existe aparece como
            planejado, sem simular funcionalidades.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ModuleCard
            icon="activity"
            title="Atividades"
            description="Hábitos e práticas acompanhados em uma grade de contribuições, com sequências e histórico diário."
            status="Ativo"
            meta={
              activityCount === 0
                ? 'Nenhuma atividade criada ainda'
                : `${activityCount} ${activityCount === 1 ? 'atividade' : 'atividades'} no seu espaço`
            }
            to="/atividades"
          />
          <ModuleCard
            icon="feather"
            title="Diário"
            description="Escrita livre, sem formulários. Cada registro vira um arquivo Markdown seu, com busca local por título, conteúdo e etiquetas."
            status="Ativo"
            meta="Arquivos Markdown em data/diary"
            to="/diario"
          />
          <ModuleCard
            icon="book-open"
            title="Conhecimento"
            description="Notas, referências e contexto pessoal em Markdown, conectados ao seu universo."
            status="Planejado"
            meta="Sem implementação nesta versão"
          />
          <ModuleCard
            icon="folder"
            title="Projetos"
            description="Acompanhamento de projetos pessoais, etapas, decisões e materiais relacionados."
            status="Planejado"
            meta="Sem implementação nesta versão"
          />
          <ModuleCard
            icon="cpu"
            title="IA"
            description="Uma companheira capaz de consultar seu contexto local com limites e autorização explícitos."
            status="Planejado"
            meta="Nenhuma integração de IA está ativa"
          />
        </div>
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
