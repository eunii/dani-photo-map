import type { ScanPhotoLibraryProgressPayload } from '@application/dto/ScanPhotoLibraryProgress'
import type { InBatchDuplicateDetail } from '@application/dto/ScanPhotoLibraryResult'
import type { OrganizeJobStatus, ScanPhotoLibrarySummary } from '@shared/types/preload'
import type { GroupSavePhase } from '@presentation/renderer/pages/organize/organizeGroupForm'

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

/**
 * `runOrganizeJob`(메인 프로세스)이 그룹을 순차 저장하는 동안 노출하는
 * `progress.currentGroupKey` 하나만으로, 이번 실행에 포함된 그룹들의
 * 저장 단계(대기/진행/완료/실패)를 렌더러에서 역산한다.
 */
export function computeGroupSavePhasesFromJobStatus(
  groupKeysInRun: string[],
  status: OrganizeJobStatus
): Record<string, GroupSavePhase> {
  if (groupKeysInRun.length === 0) {
    return {}
  }

  const currentGroupKey = status.progress.currentGroupKey
  const currentIndex = currentGroupKey ? groupKeysInRun.indexOf(currentGroupKey) : -1

  const phases: Record<string, GroupSavePhase> = {}

  groupKeysInRun.forEach((groupKey, index) => {
    if (status.phase === 'completed' || status.phase === 'cancelled') {
      phases[groupKey] =
        status.phase === 'cancelled' && currentIndex >= 0 && index > currentIndex
          ? 'idle'
          : 'done'
      return
    }

    if (status.phase === 'failed') {
      if (currentIndex < 0) {
        phases[groupKey] = 'idle'
      } else if (index < currentIndex) {
        phases[groupKey] = 'done'
      } else if (index === currentIndex) {
        phases[groupKey] = 'error'
      } else {
        phases[groupKey] = 'idle'
      }
      return
    }

    // save-running (or any other in-flight phase)
    if (currentIndex < 0) {
      phases[groupKey] = 'queued'
    } else if (index < currentIndex) {
      phases[groupKey] = 'done'
    } else if (index === currentIndex) {
      phases[groupKey] = 'saving'
    } else {
      phases[groupKey] = 'queued'
    }
  })

  return phases
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
