import { Icon } from '@/components/shared/Icon'
import { Badge } from '@/components/ui/badge'
import { MEDIA_STATUS_LABELS, mediaTypeIcon, statusBadgeVariant } from '@/lib/media'
import type { MediaStatus, MediaType } from '@/features/media/types'

export function MediaStatusBadge({ status }: { status: MediaStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{MEDIA_STATUS_LABELS[status]}</Badge>
}

export function MediaTypeBadge({ type }: { type: MediaType }) {
  return (
    <Badge variant="secondary">
      <Icon name={mediaTypeIcon(type)} size={11} />
      {type.name}
    </Badge>
  )
}
