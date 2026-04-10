/**
 * Logical group keys include `day=` for calendar granularity. Monthly grouping
 * uses `day=00`; legacy indexes may use a concrete day. Metadata merge and
 * preview title inheritance match on region + year + month + slot (+ manual).
 */

export interface ParsedGroupKeyParts {
  region: string
  year: string
  month: string
  basis?: string
  day: string
  slot: string
  manual?: string
}

export function parseGroupKeyParts(groupKey: string): ParsedGroupKeyParts | null {
  const parts = groupKey.split('|')

  if (parts[0] !== 'group') {
    return null
  }

  const map: Record<string, string> = {}

  for (let index = 1; index < parts.length; index += 1) {
    const segment = parts[index]

    if (!segment) {
      continue
    }

    const equalsIndex = segment.indexOf('=')

    if (equalsIndex <= 0) {
      continue
    }

    const key = segment.slice(0, equalsIndex)
    const rawValue = segment.slice(equalsIndex + 1)

    try {
      map[key] = decodeURIComponent(rawValue)
    } catch {
      map[key] = rawValue
    }
  }

  const { region, year, month, day, slot } = map

  if (
    region === undefined ||
    year === undefined ||
    month === undefined ||
    day === undefined ||
    slot === undefined
  ) {
    return null
  }

  return {
    region,
    year,
    month,
    ...(map.basis !== undefined ? { basis: map.basis } : {}),
    day,
    slot,
    ...(map.manual !== undefined ? { manual: map.manual } : {})
  }
}

/** Identity for matching stored groups when `day` differs (legacy vs monthly). */
export function groupKeyIdentitySignature(groupKey: string): string | null {
  const parsed = parseGroupKeyParts(groupKey)

  if (!parsed) {
    return null
  }

  const basis = parsed.basis ?? 'month'

  if (basis === 'month') {
    return `${parsed.region}|${parsed.year}|${parsed.month}|month|${parsed.slot}|${parsed.manual ?? ''}`
  }

  return `${parsed.region}|${parsed.year}|${parsed.month}|${basis}|${parsed.day}|${parsed.slot}|${parsed.manual ?? ''}`
}
