import type { ScanPhotoLibraryProgressPayload } from '@application/dto/ScanPhotoLibraryProgress'
import type { InBatchDuplicateDetail } from '@application/dto/ScanPhotoLibraryResult'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

export function computeGlobalBarProgress(
  offset: number,
  groupPhotoCount: number,
  payload: ScanPhotoLibraryProgressPayload
): number {
  if (groupPhotoCount <= 0) {
    return offset
  }

  if (payload.kind === 'prepare') {
    const denom = payload.total > 0 ? payload.total : 1

    return offset + Math.round((payload.completed / denom) * 0.5 * groupPhotoCount)
  }

  const denom = payload.total > 0 ? payload.total : 1
  const halfGroup = 0.5 * groupPhotoCount
  const filePortion = (payload.completed / denom) * 0.5 * groupPhotoCount

  return offset + Math.round(halfGroup + filePortion)
}

export function mergeScanSummaries(
  previous: ScanPhotoLibrarySummary | null,
  next: ScanPhotoLibrarySummary
): ScanPhotoLibrarySummary {
  if (!previous) {
    return next
  }

  return {
    scannedCount: Math.max(previous.scannedCount, next.scannedCount),
    skippedUnchangedCount:
      previous.skippedUnchangedCount + next.skippedUnchangedCount,
    duplicateCount: previous.duplicateCount + next.duplicateCount,
    keptCount: previous.keptCount + next.keptCount,
    copiedCount: previous.copiedCount + next.copiedCount,
    skippedExistingCount: previous.skippedExistingCount + next.skippedExistingCount,
    groupCount: next.groupCount,
    warningCount: previous.warningCount + next.warningCount,
    failureCount: previous.failureCount + next.failureCount,
    issues: [...previous.issues, ...next.issues],
    inBatchDuplicateDetails: [
      ...previous.inBatchDuplicateDetails,
      ...next.inBatchDuplicateDetails
    ],
    existingOutputSkipDetails: [
      ...previous.existingOutputSkipDetails,
      ...next.existingOutputSkipDetails
    ],
    skippedUnchangedDetails: [
      ...previous.skippedUnchangedDetails,
      ...next.skippedUnchangedDetails
    ],
    mapGroups: next.mapGroups
  }
}

export function groupInBatchDuplicateDetails(rows: InBatchDuplicateDetail[]) {
  const map = new Map<
    string,
    { canonicalSourcePath: string; duplicateSourcePaths: string[] }
  >()

  for (const row of rows) {
    const existing = map.get(row.canonicalPhotoId)

    if (!existing) {
      map.set(row.canonicalPhotoId, {
        canonicalSourcePath: row.canonicalSourcePath,
        duplicateSourcePaths: [row.duplicateSourcePath]
      })
    } else {
      existing.duplicateSourcePaths.push(row.duplicateSourcePath)
    }
  }

  return [...map.entries()].map(([canonicalPhotoId, value]) => ({
    canonicalPhotoId,
    canonicalSourcePath: value.canonicalSourcePath,
    duplicateSourcePaths: value.duplicateSourcePaths
  }))
}
