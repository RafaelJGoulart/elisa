export const ACTIVITY_COLORS = [
  { key: 'purple', label: 'Roxo', hex: '#8B5CF6' },
  { key: 'magenta', label: 'Magenta', hex: '#EC4899' },
  { key: 'red', label: 'Vermelho', hex: '#F43F5E' },
  { key: 'green', label: 'Verde', hex: '#4ADE80' },
  { key: 'blue', label: 'Azul', hex: '#60A5FA' },
  { key: 'yellow', label: 'Amarelo', hex: '#FACC15' },
  { key: 'orange', label: 'Laranja', hex: '#FB923C' },
] as const

export type ActivityColor = (typeof ACTIVITY_COLORS)[number]['key']

const COLOR_KEYS = new Set<string>(ACTIVITY_COLORS.map((color) => color.key))

export function isActivityColor(value: string): value is ActivityColor {
  return COLOR_KEYS.has(value)
}

export function getActivityColor(color: string): (typeof ACTIVITY_COLORS)[number] {
  return ACTIVITY_COLORS.find((entry) => entry.key === color) ?? ACTIVITY_COLORS[0]
}
