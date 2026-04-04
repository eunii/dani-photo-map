import type { Photo } from '@domain/entities/Photo'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export function isUsableCapturedAtValue(
  capturedAt: PhotoTimestamp | undefined
): boolean {
  if (!capturedAt) {
    return false
  }

  if (capturedAt.year === '0000' || capturedAt.month === '00') {
    return false
  }

  return true
}

export function pickEarliestUsableCapturedAtFromPhotos(
  photos: Photo[]
): PhotoTimestamp | undefined {
  const valid = photos
    .map((photo) => photo.capturedAt)
    .filter((capturedAt): capturedAt is PhotoTimestamp =>
      isUsableCapturedAtValue(capturedAt)
    )

  if (valid.length === 0) {
    return undefined
  }

  valid.sort((left, right) => left.iso.localeCompare(right.iso))

  return valid[0]
}

/** `2026-04-03 seoul` 형태의 자동 그룹 제목 여부 (사용자 지정 "동일제목" 등은 false). */
export function looksLikeAutoDateRegionTitle(title: string): boolean {
  return /^\d{4}-\d{2}(-\d{2})?\s+\S/.test(title.trim())
}

/**
 * 기존 그룹과 합친 뒤 표시용 제목. manualGroupTitle 우선,
 * 다음은 목적지 제목이 자동 형식이 아니면 그대로 유지(메타·사용자 제목 보존),
 * 자동 형식이면 사진 중 가장 이른 유효 촬영일 + 지역.
 */
export function deriveMergedGroupTitleFromPhotos(
  photos: Photo[],
  regionName: string,
  fallbackTitle: string
): string {
  const manualTitle = photos
    .map((photo) => photo.manualGroupTitle)
    .find((title) => title && title.trim().length > 0)

  if (manualTitle) {
    return manualTitle.trim()
  }

  const trimmedFallback = fallbackTitle.trim()

  if (trimmedFallback.length > 0 && !looksLikeAutoDateRegionTitle(trimmedFallback)) {
    return trimmedFallback
  }

  const earliest = pickEarliestUsableCapturedAtFromPhotos(photos)

  if (earliest) {
    const dateLabel =
      earliest.day === '00'
        ? `${earliest.year}-${earliest.month}`
        : `${earliest.year}-${earliest.month}-${earliest.day}`

    return `${dateLabel} ${regionName}`.trim()
  }

  const titleDate = fallbackTitle.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)

  if (titleDate && titleDate[1] !== '0000') {
    return fallbackTitle.trim()
  }

  return fallbackTitle.trim()
}
