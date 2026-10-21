import featherIcons from 'feather-icons/dist/icons.json'
import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

export type IconName = string

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
  style?: CSSProperties
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
  label,
  style,
}: IconProps) {
  const markup = featherIcons[name]

  if (!markup) {
    return null
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={cn('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
