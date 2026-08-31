import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import {
  RENAME_MOVE_CONCURRENCY_LIMIT,
  RENAME_SAVE_CHECKPOINT_BATCH_SIZE
} from '@application/services/groupAwarePhotoRelocationConstants'
import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import {
  buildGroupAwarePhotoOutputRelativePath,
  buildOrganizedNamePatternPrefix
} from '@domain/services/GroupAwarePhotoNamingService'
import {
  getPathBaseName,
  getPathDirectoryName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

export interface PlannedRename {
  photoId: string
  currentAbsolutePath: string
  nextAbsolutePath: string
  nextOutputRelativePath: string
}

export interface RenameablePhoto extends Photo {
  regionName: string
  outputRelativePath: string
}

export function toRenameablePhoto(photo: Photo): RenameablePhoto | null {
  if (!photo.outputRelativePath) {
    return null
  }

  const normalizedOutputRelativePath = normalizePathSeparators(photo.outputRelativePath)
  const pathSegments = normalizedOutputRelativePath.split('/').filter(Boolean)
  /** `년/월/파일`만 있고 지역 폴더가 생략된 경우(unknown 라벨)는 세그먼트가 3개 */
  if (pathSegments.length < 3) {
    return null
  }

  const regionNameFromPath =
    pathSegments.length >= 4 ? pathSegments.at(-2) : undefined
  const regionName =
    photo.regionName ?? regionNameFromPath ?? 'base'

  return {
    ...photo,
    regionName,
    outputRelativePath: normalizedOutputRelativePath
  }
}

export async function createGroupAwareRenamePlan(params: {
  photos: Photo[]
  outputRoot: string
  groupTitle: string
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'listDirectoryFileNames'>
  rules: OrganizationRules
}): Promise<PlannedRename[]> {
  const { fileSystem, groupTitle, outputRoot, photos, rules } = params
  const groupPhotos = photos
    .map((photo) => toRenameablePhoto(photo))
    .filter((photo): photo is RenameablePhoto => photo !== null)
    .sort((left, right) => {
      const leftCapturedAt = left.capturedAt?.iso ?? ''
      const rightCapturedAt = right.capturedAt?.iso ?? ''

      if (leftCapturedAt !== rightCapturedAt) {
        return leftCapturedAt.localeCompare(rightCapturedAt)
      }

      return left.sourceFileName.localeCompare(right.sourceFileName)
    })
  const currentFileNamesByDirectory = new Map<string, Set<string>>()

  for (const photo of groupPhotos) {
    const currentDirectoryPath = getPathDirectoryName(photo.outputRelativePath)
    const currentFileName = getPathBaseName(photo.outputRelativePath)
    const currentFileNames = currentFileNamesByDirectory.get(currentDirectoryPath) ?? new Set<string>()

    currentFileNames.add(currentFileName)
    currentFileNamesByDirectory.set(currentDirectoryPath, currentFileNames)
  }

  const occupiedFileNamesByDirectory = new Map<string, Set<string>>()
  const renamePlan: PlannedRename[] = []

  for (const photo of groupPhotos) {
    const targetDirectoryPath = getPathDirectoryName(
      buildGroupAwarePhotoOutputRelativePath(photo, groupTitle, 1, rules)
    )
    const targetDirectoryAbsolutePath = joinPathSegments(
      outputRoot,
      targetDirectoryPath
    )
    const occupiedFileNames = await getOccupiedFileNames({
      currentFileNamesByDirectory,
      fileSystem,
      occupiedFileNamesByDirectory,
      targetDirectoryAbsolutePath,
      targetDirectoryPath
    })
    const nextSequenceNumber = findNextSequenceNumber(occupiedFileNames, photo)
    const nextOutputRelativePath = buildGroupAwarePhotoOutputRelativePath(
      photo,
      groupTitle,
      nextSequenceNumber,
      rules
    )
    const nextFileName = getPathBaseName(nextOutputRelativePath)

    occupiedFileNames.add(nextFileName)
    renamePlan.push({
      photoId: photo.id,
      currentAbsolutePath: joinPathSegments(outputRoot, photo.outputRelativePath),
      nextAbsolutePath: joinPathSegments(outputRoot, nextOutputRelativePath),
      nextOutputRelativePath
    })
  }

  return renamePlan
}

export interface RenamePlanBatchCompletion {
  /** 이번 체크포인트에서 새로 완료된 항목만 (전체 누적이 아님). */
  completedRenames: PlannedRename[]
  completedPhotoCount: number
  totalPhotoCount: number
}

export interface ApplyRenamePlanOptions {
  /** 동시에 진행할 파일 이동 작업 수. */
  concurrencyLimit?: number
  /** 이 개수만큼 완료될 때마다 `onBatchComplete`을 호출한다. */
  checkpointBatchSize?: number
  /**
   * 진행 도중 체크포인트 배치가 다 찰 때마다 호출된다 (전체가 checkpointBatchSize보다
   * 작으면 한 번도 호출되지 않을 수 있음 — 그 경우 호출자가 성공 반환 후 전체를 한 번에 반영).
   */
  onBatchComplete?: (batch: RenamePlanBatchCompletion) => Promise<void> | void
  onProgress?: (payload: { completed: number; total: number }) => void
}

async function renamePhotoUnit(
  plan: PlannedRename,
  unitIndex: number,
  temporaryRenameToken: string,
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'ensureDirectory' | 'moveFile'>
): Promise<void> {
  const temporaryAbsolutePath = joinPathSegments(
    getPathDirectoryName(plan.currentAbsolutePath),
    `po-${temporaryRenameToken}-${unitIndex}.tmp`
  )

  await fileSystem.moveFile(plan.currentAbsolutePath, temporaryAbsolutePath)

  try {
    await fileSystem.ensureDirectory(getPathDirectoryName(plan.nextAbsolutePath))
    await fileSystem.moveFile(temporaryAbsolutePath, plan.nextAbsolutePath)
  } catch (error) {
    try {
      await fileSystem.moveFile(temporaryAbsolutePath, plan.currentAbsolutePath)
    } catch {
      // 임시 파일이 남을 수 있음 — 원래 에러를 그대로 던져 호출자에게 알린다.
    }

    throw error
  }
}

/**
 * 사진을 하나씩 임시 이름 → 최종 이름으로 옮긴다. 한 사진의 두 단계(임시/최종 이동)는
 * 항상 함께 끝나거나(성공) 원래 자리로 되돌아가므로(실패), 인덱스가 `.tmp` 경로를
 * 가리키는 중간 상태가 저장되는 일은 없다. `checkpointBatchSize`만큼 모일 때마다
 * `onBatchComplete`으로 지금까지 완료된 항목만 넘겨 호출자가 인덱스를 중간 저장할 수
 * 있게 한다 — 도중에 실패해도 이미 체크포인트된 항목은 그대로 유지된다.
 */
export async function applyRenamePlan(
  renamePlan: PlannedRename[],
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'ensureDirectory' | 'moveFile'>,
  options: ApplyRenamePlanOptions = {}
): Promise<void> {
  const {
    concurrencyLimit = RENAME_MOVE_CONCURRENCY_LIMIT,
    checkpointBatchSize = RENAME_SAVE_CHECKPOINT_BATCH_SIZE,
    onBatchComplete,
    onProgress
  } = options

  const activePlan = renamePlan.filter(
    (plan) => plan.currentAbsolutePath !== plan.nextAbsolutePath
  )
  const total = activePlan.length

  if (total === 0) {
    return
  }

  const temporaryRenameToken = Date.now().toString(36)
  let completed = 0
  let pendingCheckpoint: PlannedRename[] = []
  let firstError: unknown
  let nextIndex = 0

  async function flushCheckpoint(): Promise<void> {
    if (pendingCheckpoint.length === 0 || !onBatchComplete) {
      pendingCheckpoint = []
      return
    }

    const batch = pendingCheckpoint
    pendingCheckpoint = []
    await onBatchComplete({
      completedRenames: batch,
      completedPhotoCount: completed,
      totalPhotoCount: total
    })
  }

  async function runWorker(): Promise<void> {
    for (;;) {
      if (firstError !== undefined) {
        return
      }

      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= activePlan.length) {
        return
      }

      const plan = activePlan[currentIndex]!

      try {
        await renamePhotoUnit(plan, currentIndex, temporaryRenameToken, fileSystem)
        completed += 1
        pendingCheckpoint.push(plan)
        onProgress?.({ completed, total })

        if (pendingCheckpoint.length >= checkpointBatchSize) {
          await flushCheckpoint()
        }
      } catch (error) {
        if (firstError === undefined) {
          firstError = error
        }

        return
      }
    }
  }

  const workerCount = Math.min(concurrencyLimit, activePlan.length)
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))

  if (firstError !== undefined) {
    throw firstError
  }
}

async function getOccupiedFileNames(params: {
  targetDirectoryPath: string
  targetDirectoryAbsolutePath: string
  currentFileNamesByDirectory: Map<string, Set<string>>
  occupiedFileNamesByDirectory: Map<string, Set<string>>
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'listDirectoryFileNames'>
}): Promise<Set<string>> {
  const {
    currentFileNamesByDirectory,
    fileSystem,
    occupiedFileNamesByDirectory,
    targetDirectoryAbsolutePath,
    targetDirectoryPath
  } = params
  const existingOccupiedFileNames = occupiedFileNamesByDirectory.get(targetDirectoryPath)

  if (existingOccupiedFileNames) {
    return existingOccupiedFileNames
  }

  const directoryFileNames = new Set(
    await fileSystem.listDirectoryFileNames(targetDirectoryAbsolutePath)
  )
  const currentFileNames = currentFileNamesByDirectory.get(targetDirectoryPath) ?? new Set<string>()

  for (const currentFileName of currentFileNames) {
    directoryFileNames.delete(currentFileName)
  }

  occupiedFileNamesByDirectory.set(targetDirectoryPath, directoryFileNames)

  return directoryFileNames
}

function findNextSequenceNumber(
  occupiedFileNames: Set<string>,
  photo: Photo
): number {
  const stem = buildOrganizedNamePatternPrefix(
    photo.sourceFileName,
    photo.capturedAt
  )
  const lastDotIndex = photo.sourceFileName.lastIndexOf('.')
  const extension =
    lastDotIndex > 0 ? photo.sourceFileName.slice(lastDotIndex) : ''
  const pattern = new RegExp(
    `^${escapeRegExp(stem)}_(\\d{3})${escapeRegExp(extension)}$`
  )
  let maxSequenceNumber = 0

  for (const occupiedFileName of occupiedFileNames) {
    const match = occupiedFileName.match(pattern)

    if (!match) {
      continue
    }

    const sequenceNumber = Number.parseInt(match[1] ?? '0', 10)

    if (sequenceNumber > maxSequenceNumber) {
      maxSequenceNumber = sequenceNumber
    }
  }

  return maxSequenceNumber + 1
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
