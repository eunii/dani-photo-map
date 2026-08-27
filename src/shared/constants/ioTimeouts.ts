export const HASH_IO_TIMEOUT_MS = 20_000
export const EXIF_IO_TIMEOUT_MS = 8_000
export const SHARP_IO_TIMEOUT_MS = 8_000
export const SHARP_IO_TIMEOUT_SECONDS = Math.max(
  1,
  Math.ceil(SHARP_IO_TIMEOUT_MS / 1000)
)
