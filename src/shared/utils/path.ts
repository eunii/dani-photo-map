export function joinPathSegments(...segments: string[]): string {
  return segments
    .map((segment) => segment.replace(/\\/g, '/'))
    .filter((segment) => segment.length > 0)
    .join('/')
    .replace(/\/{2,}/g, '/')
}
