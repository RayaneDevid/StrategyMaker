export const CURSOR_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#ef4444', // red
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
] as const

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const SNAPSHOT_SAVE_INTERVAL = 30_000 // 30s
export const CURSOR_THROTTLE_MS = 50
