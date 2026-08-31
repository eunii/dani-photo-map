import { describe, expect, it, vi } from 'vitest'

import {
  applyRenamePlan,
  toRenameablePhoto,
  type PlannedRename
} from '@application/services/groupAwarePhotoRelocation'
import type { Photo } from '@domain/entities/Photo'

function plannedRename(index: number): PlannedRename {
  return {
    photoId: `photo-${index}`,
    currentAbsolutePath: `C:/output/current/${index}.jpg`,
    nextAbsolutePath: `C:/output/next/${index}.jpg`,
    nextOutputRelativePath: `next/${index}.jpg`
  }
}

function createFileSystemMock() {
  return {
    ensureDirectory: vi.fn().mockResolvedValue(undefined),
    moveFile: vi.fn().mockResolvedValue(undefined)
  }
}

function minimalPhoto(
  overrides: Partial<Photo> & Pick<Photo, 'id' | 'outputRelativePath'>
): Photo {
  return {
    sourcePath: 'C:/in.jpg',
    sourceFileName: 'in.jpg',
    isDuplicate: false,
    metadataIssues: [],
    ...overrides
  }
}

describe('toRenameablePhoto', () => {
  it('returns null when output path has fewer than year/month/file', () => {
    expect(
      toRenameablePhoto(
        minimalPhoto({
          id: 'p1',
          outputRelativePath: '2026/photo.jpg'
        })
      )
    ).toBeNull()
  })

  it('uses base when path is year/month/file and regionName is missing', () => {
    const r = toRenameablePhoto(
      minimalPhoto({
        id: 'p1',
        outputRelativePath: '2026/04/2026-04-03_080000_IMG.JPG'
      })
    )
    expect(r).not.toBeNull()
    expect(r?.regionName).toBe('base')
  })

  it('uses parent folder as region when path has four or more segments', () => {
    const r = toRenameablePhoto(
      minimalPhoto({
        id: 'p1',
        outputRelativePath: '2026/04/seoul/2026-04-03_080000_IMG.JPG'
      })
    )
    expect(r?.regionName).toBe('seoul')
  })
})

describe('applyRenamePlan', () => {
  it('moves every entry through a temp name to its final name', async () => {
    const fileSystem = createFileSystemMock()
    const plan = [plannedRename(1), plannedRename(2)]

    await applyRenamePlan(plan, fileSystem)

    expect(fileSystem.moveFile).toHaveBeenCalledTimes(4)
    for (const entry of plan) {
      const finalCall = fileSystem.moveFile.mock.calls.find(
        (call) => call[1] === entry.nextAbsolutePath
      )
      expect(finalCall).toBeDefined()
    }
  })

  it('skips entries whose current and next path are already identical', async () => {
    const fileSystem = createFileSystemMock()
    const unchanged: PlannedRename = {
      photoId: 'unchanged',
      currentAbsolutePath: 'C:/output/same.jpg',
      nextAbsolutePath: 'C:/output/same.jpg',
      nextOutputRelativePath: 'same.jpg'
    }

    await applyRenamePlan([unchanged], fileSystem)

    expect(fileSystem.moveFile).not.toHaveBeenCalled()
  })

  it('checkpoints in batches and reports monotonically increasing progress', async () => {
    const fileSystem = createFileSystemMock()
    const plan = Array.from({ length: 9 }, (_, index) => plannedRename(index))
    const batches: number[] = []
    const progress: Array<{ completed: number; total: number }> = []

    await applyRenamePlan(plan, fileSystem, {
      checkpointBatchSize: 4,
      concurrencyLimit: 3,
      onBatchComplete: ({ completedRenames }) => {
        batches.push(completedRenames.length)
      },
      onProgress: (payload) => {
        progress.push(payload)
      }
    })

    // 9 entries, batch size 4 -> two full checkpoints fire during the loop;
    // the trailing remainder (1 entry) is left for the caller to apply itself.
    expect(batches).toEqual([4, 4])
    expect(progress).toHaveLength(9)
    expect(progress.every((p) => p.total === 9)).toBe(true)
    const completedValues = progress.map((p) => p.completed)
    const sorted = [...completedValues].sort((a, b) => a - b)
    expect(completedValues).toEqual(sorted)
    expect(new Set(completedValues).size).toBe(9)
  })

  it('self-heals a failed entry and still throws, without touching already-succeeded ones', async () => {
    const fileSystem = createFileSystemMock()
    const plan = [plannedRename(1), plannedRename(2)]
    const failure = new Error('disk full')

    fileSystem.moveFile.mockImplementation(
      async (from: string, to: string) => {
        if (to === plan[1]!.nextAbsolutePath) {
          throw failure
        }
      }
    )

    await expect(
      applyRenamePlan(plan, fileSystem, { concurrencyLimit: 1 })
    ).rejects.toBe(failure)

    // photo-1 completed fully (temp -> final).
    expect(fileSystem.moveFile).toHaveBeenCalledWith(
      plan[0]!.currentAbsolutePath,
      expect.stringContaining('po-')
    )
    expect(fileSystem.moveFile).toHaveBeenCalledWith(
      expect.stringContaining('po-'),
      plan[0]!.nextAbsolutePath
    )

    // photo-2's final move failed, so it should be reverted back to its temp
    // path's original location rather than left at (or short of) the destination.
    const revertCall = fileSystem.moveFile.mock.calls.find(
      (call) => call[1] === plan[1]!.currentAbsolutePath
    )
    expect(revertCall).toBeDefined()
  })
})
