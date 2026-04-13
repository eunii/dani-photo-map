import { describe, expect, it } from 'vitest'

import type { InBatchDuplicateDetail } from '@application/dto/ScanPhotoLibraryResult'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

import {
  computeGlobalBarProgress,
  groupInBatchDuplicateDetails,
  mergeScanSummaries
} from './organizeScanSummaryMerge'

function emptySummary(overrides: Partial<ScanPhotoLibrarySummary> = {}): ScanPhotoLibrarySummary {
  return {
    scannedCount: 0,
    skippedUnchangedCount: 0,
    duplicateCount: 0,
    keptCount: 0,
    copiedCount: 0,
    skippedExistingCount: 0,
    skippedUnchangedDetails: [],
    groupCount: 0,
    warningCount: 0,
    failureCount: 0,
    issues: [],
    inBatchDuplicateDetails: [],
    existingOutputSkipDetails: [],
    mapGroups: [],
    ...overrides
  }
}

describe('mergeScanSummaries', () => {
  it('returns next when previous is null', () => {
    const next = emptySummary({ scannedCount: 3, groupCount: 2 })
    expect(mergeScanSummaries(null, next)).toBe(next)
  })

  it('merges counts and concatenates detail arrays; scannedCount uses max; groupCount and mapGroups from next', () => {
    const previous = emptySummary({
      scannedCount: 10,
      skippedUnchangedCount: 1,
      duplicateCount: 2,
      keptCount: 3,
      copiedCount: 4,
      skippedExistingCount: 5,
      groupCount: 1,
      warningCount: 1,
      failureCount: 1,
      issues: [
        {
          code: 'A',
          severity: 'warning',
          stage: 'copy',
          sourcePath: '/a',
          message: 'm'
        }
      ],
      inBatchDuplicateDetails: [
        {
          duplicatePhotoId: 'd1',
          canonicalPhotoId: 'c1',
          duplicateSourcePath: '/dup1',
          canonicalSourcePath: '/can1'
        }
      ],
      existingOutputSkipDetails: [],
      skippedUnchangedDetails: [],
      mapGroups: [{ id: 'old', title: 't', photoCount: 1, latitude: 0, longitude: 0 }]
    })

    const next = emptySummary({
      scannedCount: 8,
      skippedUnchangedCount: 2,
      duplicateCount: 1,
      keptCount: 1,
      copiedCount: 1,
      skippedExistingCount: 1,
      groupCount: 3,
      warningCount: 2,
      failureCount: 3,
      issues: [
        {
          code: 'B',
          severity: 'error',
          stage: 'hash',
          sourcePath: '/b',
          message: 'n'
        }
      ],
      inBatchDuplicateDetails: [
        {
          duplicatePhotoId: 'd2',
          canonicalPhotoId: 'c2',
          duplicateSourcePath: '/dup2',
          canonicalSourcePath: '/can2'
        }
      ],
      existingOutputSkipDetails: [],
      skippedUnchangedDetails: [],
      mapGroups: [{ id: 'new', title: 'x', photoCount: 2, latitude: 1, longitude: 2 }]
    })

    const merged = mergeScanSummaries(previous, next)

    expect(merged.scannedCount).toBe(10)
    expect(merged.skippedUnchangedCount).toBe(3)
    expect(merged.duplicateCount).toBe(3)
    expect(merged.keptCount).toBe(4)
    expect(merged.copiedCount).toBe(5)
    expect(merged.skippedExistingCount).toBe(6)
    expect(merged.groupCount).toBe(3)
    expect(merged.warningCount).toBe(3)
    expect(merged.failureCount).toBe(4)
    expect(merged.issues).toHaveLength(2)
    expect(merged.inBatchDuplicateDetails).toHaveLength(2)
    expect(merged.mapGroups).toEqual(next.mapGroups)
  })
})

describe('computeGlobalBarProgress', () => {
  it('returns offset when groupPhotoCount is 0', () => {
    expect(
      computeGlobalBarProgress(7, 0, {
        kind: 'prepare',
        total: 10,
        completed: 5
      })
    ).toBe(7)
  })

  it('prepare phase uses first half of the group span', () => {
    const groupPhotoCount = 10
    const payload = { kind: 'prepare' as const, total: 100, completed: 50 }
    expect(computeGlobalBarProgress(0, groupPhotoCount, payload)).toBe(
      Math.round(0.5 * 0.5 * groupPhotoCount)
    )
  })

  it('fileFlowComplete phase adds second half plus file progress', () => {
    const groupPhotoCount = 10
    const payload = { kind: 'fileFlowComplete' as const, total: 20, completed: 10 }
    const halfGroup = 0.5 * groupPhotoCount
    const filePortion = (10 / 20) * 0.5 * groupPhotoCount
    expect(computeGlobalBarProgress(0, groupPhotoCount, payload)).toBe(
      Math.round(halfGroup + filePortion)
    )
  })
})

describe('groupInBatchDuplicateDetails', () => {
  it('groups duplicate paths by canonical id', () => {
    const rows: InBatchDuplicateDetail[] = [
      {
        duplicatePhotoId: 'a',
        canonicalPhotoId: 'c',
        duplicateSourcePath: '/1',
        canonicalSourcePath: '/can'
      },
      {
        duplicatePhotoId: 'b',
        canonicalPhotoId: 'c',
        duplicateSourcePath: '/2',
        canonicalSourcePath: '/can'
      }
    ]

    const grouped = groupInBatchDuplicateDetails(rows)
    expect(grouped).toHaveLength(1)
    const first = grouped[0]
    expect(first).toBeDefined()
    expect(first!.canonicalPhotoId).toBe('c')
    expect(first!.canonicalSourcePath).toBe('/can')
    expect(first!.duplicateSourcePaths).toEqual(['/1', '/2'])
  })
})
