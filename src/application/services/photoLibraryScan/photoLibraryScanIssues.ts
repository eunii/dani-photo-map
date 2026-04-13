export function getScanErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
