import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'

export function normalizeFolderLabelForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

export function folderLabelMatches(input: string, folderLabel: string): boolean {
  return (
    normalizeFolderLabelForMatch(input) ===
    normalizeFolderLabelForMatch(folderLabel)
  )
}

/** 이름 변경 UI: 자동 제목 앞의 년·월(·일) 접두 제거. 남는 것이 없으면 원문 유지 */
export function folderRenameLabelWithoutDate(raw: string): string {
  const t = raw.trim()
  if (!t) {
    return ''
  }
  const stripped = stripLeadingDateFromGroupTitle(t)
  return stripped.length > 0 ? stripped : t
}

export function formatCapturedLabel(iso?: string): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString()
}

export function toPreviewTimestamp(capturedAtIso?: string) {
  if (!capturedAtIso) {
    return undefined
  }

  const date = new Date(capturedAtIso)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return {
    iso: capturedAtIso,
    year: String(date.getUTCFullYear()).padStart(4, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
    time: [
      String(date.getUTCHours()).padStart(2, '0'),
      String(date.getUTCMinutes()).padStart(2, '0'),
      String(date.getUTCSeconds()).padStart(2, '0')
    ].join('')
  }
}
