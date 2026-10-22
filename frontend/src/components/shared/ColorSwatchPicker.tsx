import { ACTIVITY_COLORS, type ActivityColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

interface ColorSwatchPickerProps {
  name: string
  value: ActivityColor
  onChange: (color: ActivityColor) => void
  disabled?: boolean
}

export function ColorSwatchPicker({
  name,
  value,
  onChange,
  disabled,
}: ColorSwatchPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
        Cor de destaque
      </legend>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_COLORS.map((color) => {
          const checked = color.key === value
          return (
            <label
              key={color.key}
              className={cn(
                'relative flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring',
                checked
                  ? 'border-foreground/70 ring-2 ring-foreground/20'
                  : 'border-transparent hover:border-border',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={color.key}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(color.key)}
                className="sr-only focus-visible:outline-none"
                aria-label={color.label}
              />
              <span
                className="size-5 rounded-full"
                style={{ backgroundColor: color.hex }}
                aria-hidden="true"
              />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
