import { normalize, resolve, sep } from 'node:path'

/**
 * `candidateAbsolutePath`가 `rootDirectoryAbsolute`와 같거나 그 하위인지 검사합니다.
 */
export function isResolvedPathUnderRoot(
  rootDirectoryAbsolute: string,
  candidateAbsolutePath: string
): boolean {
  const parent = resolve(normalize(rootDirectoryAbsolute))
  const child = resolve(normalize(candidateAbsolutePath))
  if (child === parent) {
    return true
  }
  return child.startsWith(parent + sep)
}
