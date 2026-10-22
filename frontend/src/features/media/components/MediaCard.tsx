import { Link } from 'react-router-dom'

import { Icon } from '@/components/shared/Icon'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateBR } from '@/lib/dates'
import { formatDecimal, formatMinutes } from '@/lib/format'
import type { MediaItemSummary } from '@/features/media/types'
import { MediaStatusBadge, MediaTypeBadge } from './MediaBadges'
import { MediaProgressBar } from './MediaProgressBar'

interface MediaCardProps {
  item: MediaItemSummary
  onEdit: (item: MediaItemSummary) => void
  onDelete: (item: MediaItemSummary) => void
}

export function MediaCard({ item, onEdit, onDelete }: MediaCardProps) {
  const { progress, time } = item
  const hasTotal = progress.total != null && progress.total > 0
  const percentLabel = progress.percent != null ? `${formatDecimal(progress.percent, 1)}%` : null

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text-disabled/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <MediaTypeBadge type={item.type} />
            <MediaStatusBadge status={item.status} />
            {item.archived ? <Badge variant="outline">arquivado</Badge> : null}
          </div>
          <h2 className="mt-2.5 truncate text-base font-semibold tracking-tight text-foreground">
            <Link
              to={`/midia/${item.id}`}
              className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {item.title}
            </Link>
          </h2>
          {item.alternateTitle ? (
            <p className="truncate text-xs text-text-secondary italic">{item.alternateTitle}</p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            {item.creator ? <span className="truncate">{item.creator}</span> : null}
            {item.creator && item.releaseYear ? <span aria-hidden="true">·</span> : null}
            {item.releaseYear ? <span className="font-mono">{item.releaseYear}</span> : null}
            {item.rating ? (
              <>
                {(item.creator || item.releaseYear) && <span aria-hidden="true">·</span>}
                <span className="flex items-center gap-1 text-yellow">
                  <Icon name="star" size={11} />
                  {item.rating}/5
                </span>
              </>
            ) : null}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="-mt-1 -mr-1 rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Opções de ${item.title}`}
            >
              <Icon name="more-horizontal" size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/midia/${item.id}`} className="flex items-center gap-2">
                <Icon name="external-link" size={14} />
                Abrir detalhes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(item)}>
              <Icon name="edit-2" size={14} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
              <Icon name="trash-2" size={14} />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {item.genres.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Gêneros">
          {item.genres.slice(0, 4).map((genre) => (
            <li key={genre}>
              <Badge variant="outline" className="text-[10px]">
                {genre}
              </Badge>
            </li>
          ))}
          {item.genres.length > 4 ? (
            <li>
              <Badge variant="outline" className="text-[10px]">
                +{item.genres.length - 4}
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      {item.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {item.description}
        </p>
      ) : null}

      <div className="mt-auto space-y-4 pt-5">
        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="font-mono text-sm text-foreground">
              {formatDecimal(progress.current)}{' '}
              {hasTotal ? (
                <span className="text-text-secondary">
                  / {formatDecimal(progress.total ?? 0)} {progress.label}
                </span>
              ) : (
                <span className="text-text-secondary">{progress.label}</span>
              )}
            </p>
            {percentLabel ? (
              <span className="shrink-0 font-mono text-xs text-text-secondary">
                {percentLabel}
              </span>
            ) : null}
          </div>
          {hasTotal ? (
            <MediaProgressBar
              className="mt-2"
              percent={progress.percent}
              label={`Progresso de ${item.title}`}
            />
          ) : (
            <p className="mt-1 text-[11px] text-text-secondary">
              Total não informado. O progresso mostra apenas o que foi registrado.
            </p>
          )}
          {progress.override != null ? (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-secondary">
              <Icon name="edit-3" size={10} />
              Progresso manual ativo
            </p>
          ) : null}
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Icon name="clock" size={12} className="text-text-disabled" />
            <dt className="sr-only">Tempo conhecido</dt>
            <dd>
              {time.totalKnownMinutes > 0
                ? formatMinutes(time.totalKnownMinutes)
                : time.unknownEvents > 0
                  ? 'Tempo não informado'
                  : 'Sem consumo'}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="repeat" size={12} className="text-text-disabled" />
            <dt className="sr-only">Registros</dt>
            <dd>
              {item.eventCount} {item.eventCount === 1 ? 'registro' : 'registros'}
              {item.repeatCount > 0 ? ` · ${item.repeatCount} revisita(s)` : ''}
            </dd>
          </div>
          {item.lastConsumedOn ? (
            <div className="flex items-center gap-1.5">
              <Icon name="calendar" size={12} className="text-text-disabled" />
              <dt className="sr-only">Último consumo</dt>
              <dd>{formatDateBR(item.lastConsumedOn)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  )
}
