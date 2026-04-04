import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import {
  buildGroupAwarePhotoOutputRelativePath,
  createGroupAwarePhotoFileNamePrefix
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
  const regionNameFromPath =
    pathSegments.length >= 4 ? pathSegments.at(-2) : undefined
  const regionName = photo.regionName ?? regionNameFromPath

  if (!regionName) {
    return null
  }

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
    const nextSequenceNumber = findNextSequenceNumber(
      occupiedFileNames,
      photo,
      groupTitle
    )
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

export async function applyRenamePlan(
  renamePlan: PlannedRename[],
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'ensureDirectory' | 'moveFile'>
): Promise<void> {
  const temporaryRenamePlan = renamePlan
    .filter((plan) => plan.currentAbsolutePath !== plan.nextAbsolutePath)
    .map((plan, index) => ({
      ...plan,
      temporaryAbsolutePath: `${plan.currentAbsolutePath}.photo-organizer-${Date.now()}-${index}.tmp`
    }))

  for (const plan of temporaryRenamePlan) {
    await fileSystem.moveFile(plan.currentAbsolutePath, plan.temporaryAbsolutePath)
  }

  for (const plan of temporaryRenamePlan) {
    await fileSystem.ensureDirectory(getPathDirectoryName(plan.nextAbsolutePath))
    await fileSystem.moveFile(plan.temporaryAbsolutePath, plan.nextAbsolutePath)
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
  photo: Photo,
  groupTitle: string
): number {
  const prefix = createGroupAwarePhotoFileNamePrefix(groupTitle, photo.capturedAt)
  const fileName = photo.sourceFileName
  const lastDotIndex = fileName.lastIndexOf('.')
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : ''
  const pattern = new RegExp(
    `^${escapeRegExp(prefix)}_(\\d+)${escapeRegExp(extension)}$`
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
