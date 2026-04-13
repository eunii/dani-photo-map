import type { ScanPhotoLibraryExecuteOptions } from '@application/dto/ScanPhotoLibraryProgress'
import type {
  InBatchDuplicateDetail,
  ExistingOutputSkipDetail,
  ScanPhotoLibraryIssue
} from '@application/dto/ScanPhotoLibraryResult'
import {
  PhotoFileConflictError,
  type PhotoLibraryFileSystemPort
} from '@application/ports/PhotoLibraryFileSystemPort'
import { assignGroupDisplayTitledOutputRelativePaths } from '@application/services/assignGroupDisplayTitledOutputPaths'
import { createCanonicalPhotoIdByHash } from '@application/services/createCanonicalPhotoIdByHash'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type { Photo } from '@domain/entities/Photo'
import {
  getPathDirectoryName,
  joinPathSegments
} from '@shared/utils/path'

import { getScanErrorMessage } from './photoLibraryScanIssues'
import type {
  FinalizedScanResult,
  PreparedPhotoRecord,
  ScanPhotoContext,
  ScanPhotoLibraryDependencies
} from './photoLibraryScanTypes'

export async function finalizePreparedPhotos(
  preparedPhotoRecords: PreparedPhotoRecord[],
  outputRoot: string,
  existingOutputHashes: Set<string>,
  existingOutputHashToPath: Map<string, string>,
  issues: ScanPhotoLibraryIssue[],
  copyFilter:
    | {
        keys: Set<string>
        photoIdToGroupKey: Map<string, string>
      }
    | undefined,
  photoIdToGroupFileLabel: Map<string, string>,
  onScanProgress: ScanPhotoLibraryExecuteOptions['onScanProgress'] | undefined,
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<FinalizedScanResult> {
  const photosForCanonical = copyFilter?.keys.size
    ? preparedPhotoRecords
        .filter((record) => {
          const key = copyFilter.photoIdToGroupKey.get(record.photo.id)

          return key !== undefined && copyFilter.keys.has(key)
        })
        .map((record) => record.photo)
    : preparedPhotoRecords.map((record) => record.photo)
  const canonicalPhotoIdByHash = createCanonicalPhotoIdByHash(photosForCanonical)
  const copiedPhotos: Photo[] = []
  let duplicateCount = 0
  let skippedExistingCount = 0
  const inBatchDuplicateDetails: InBatchDuplicateDetail[] = []
  const existingOutputSkipDetails: ExistingOutputSkipDetail[] = []

  const recordsToFinalize = copyFilter?.keys.size
    ? preparedPhotoRecords.filter((record) => {
        const groupKey = copyFilter.photoIdToGroupKey.get(record.photo.id)

        return (
          groupKey !== undefined && copyFilter.keys.has(groupKey)
        )
      })
    : preparedPhotoRecords

  const photosToAssignOutputPaths: Photo[] = []

  for (const record of recordsToFinalize) {
    const photo = record.photo
    const canonicalPhotoId = photo.sha256
      ? canonicalPhotoIdByHash.get(photo.sha256)
      : undefined
    const isDuplicate = Boolean(
      canonicalPhotoId && canonicalPhotoId !== photo.id
    )

    if (isDuplicate) {
      continue
    }

    if (photo.sha256 && existingOutputHashes.has(photo.sha256)) {
      continue
    }

    photosToAssignOutputPaths.push(photo)
  }

  const photoIdToOutputPath = await assignGroupDisplayTitledOutputRelativePaths({
    photos: photosToAssignOutputPaths,
    photoIdToGroupFileLabel,
    outputRoot,
    rules,
    fileSystem: dependencies.fileSystem
  })

  for (const record of recordsToFinalize) {
    const assigned = photoIdToOutputPath.get(record.photo.id)

    record.photo.outputRelativePath = assigned
  }

  const finalizeTotal = recordsToFinalize.length
  let finalizeCompleted = 0

  for (const preparedPhotoRecord of recordsToFinalize) {
    const finalizedPhoto = await finalizePreparedPhoto(
      preparedPhotoRecord,
      outputRoot,
      canonicalPhotoIdByHash,
      existingOutputHashes,
      existingOutputHashToPath,
      preparedPhotoRecords,
      inBatchDuplicateDetails,
      existingOutputSkipDetails,
      issues,
      dependencies,
      rules
    )

    finalizeCompleted += 1
    onScanProgress?.({
      kind: 'fileFlowComplete',
      completed: finalizeCompleted,
      total: finalizeTotal
    })

    if (finalizedPhoto === 'duplicate') {
      duplicateCount += 1
      continue
    }

    if (finalizedPhoto === 'existing-output-duplicate') {
      skippedExistingCount += 1
      continue
    }

    if (finalizedPhoto) {
      copiedPhotos.push(finalizedPhoto)
    }
  }

  return {
    copiedPhotos,
    copiedCount: copiedPhotos.length,
    duplicateCount,
    skippedExistingCount,
    inBatchDuplicateDetails,
    existingOutputSkipDetails
  }
}

async function finalizePreparedPhoto(
  preparedPhotoRecord: PreparedPhotoRecord,
  outputRoot: string,
  canonicalPhotoIdByHash: Map<string, string>,
  existingOutputHashes: Set<string>,
  existingOutputHashToPath: Map<string, string>,
  preparedPhotoRecords: PreparedPhotoRecord[],
  inBatchDuplicateDetails: InBatchDuplicateDetail[],
  existingOutputSkipDetails: ExistingOutputSkipDetail[],
  issues: ScanPhotoLibraryIssue[],
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<Photo | 'duplicate' | 'existing-output-duplicate' | null> {
  const photo = {
    ...preparedPhotoRecord.photo
  }
  const canonicalPhotoId = photo.sha256
    ? canonicalPhotoIdByHash.get(photo.sha256)
    : undefined

  photo.isDuplicate = Boolean(canonicalPhotoId && canonicalPhotoId !== photo.id)
  photo.duplicateOfPhotoId = photo.isDuplicate ? canonicalPhotoId : undefined

  if (photo.isDuplicate && canonicalPhotoId) {
    const canonicalRecord = preparedPhotoRecords.find(
      (record) => record.photo.id === canonicalPhotoId
    )

    inBatchDuplicateDetails.push({
      duplicatePhotoId: photo.id,
      canonicalPhotoId,
      duplicateSourcePath: preparedPhotoRecord.context.sourcePath,
      canonicalSourcePath: canonicalRecord?.context.sourcePath ?? ''
    })

    return 'duplicate'
  }

  if (photo.sha256 && existingOutputHashes.has(photo.sha256)) {
    existingOutputSkipDetails.push({
      sourcePhotoId: photo.id,
      sourcePath: preparedPhotoRecord.context.sourcePath,
      sha256: photo.sha256,
      existingOutputRelativePath:
        existingOutputHashToPath.get(photo.sha256) ?? ''
    })

    return 'existing-output-duplicate'
  }

  if (photo.outputRelativePath) {
    const copySucceeded = await copyPhotoToOutput(
      outputRoot,
      photo,
      issues,
      dependencies.fileSystem
    )

    if (!copySucceeded) {
      return null
    }

    if (!photo.metadataIssues) {
      photo.metadataIssues = []
    }

    photo.thumbnailRelativePath = await generateThumbnailSafely(
      preparedPhotoRecord.context,
      photo.metadataIssues,
      issues,
      dependencies.thumbnailGenerator,
      rules
    )
  }

  return photo
}

async function copyPhotoToOutput(
  outputRoot: string,
  photo: Pick<Photo, 'id' | 'sourcePath' | 'outputRelativePath'>,
  issues: ScanPhotoLibraryIssue[],
  fileSystem: PhotoLibraryFileSystemPort
): Promise<boolean> {
  if (!photo.outputRelativePath) {
    return true
  }

  const destinationPath = joinPathSegments(outputRoot, photo.outputRelativePath)
  const destinationDirectory = getPathDirectoryName(destinationPath)

  try {
    await fileSystem.ensureDirectory(destinationDirectory)
    await fileSystem.copyFile(photo.sourcePath, destinationPath)

    return true
  } catch (error) {
    if (error instanceof PhotoFileConflictError) {
      issues.push({
        code: 'copy-destination-conflict',
        severity: 'error',
        stage: 'copy',
        sourcePath: photo.sourcePath,
        photoId: photo.id,
        outputRelativePath: photo.outputRelativePath,
        destinationPath: error.destinationPath,
        message: error.message
      })

      return false
    }

    issues.push({
      code: 'copy-failed',
      severity: 'error',
      stage: 'copy',
      sourcePath: photo.sourcePath,
      photoId: photo.id,
      outputRelativePath: photo.outputRelativePath,
      destinationPath,
      message: getScanErrorMessage(error)
    })

    return false
  }
}

async function generateThumbnailSafely(
  context: ScanPhotoContext,
  metadataIssues: string[],
  issues: ScanPhotoLibraryIssue[],
  thumbnailGenerator: ScanPhotoLibraryDependencies['thumbnailGenerator'],
  rules: OrganizationRules
): Promise<string | undefined> {
  try {
    const thumbnailPath = await thumbnailGenerator.generateForPhoto(
      context.sourcePath
    )

    return joinPathSegments(rules.outputThumbnailsRelativePath, thumbnailPath)
  } catch (error) {
    const issue: ScanPhotoLibraryIssue = {
      code: 'thumbnail-generation-failed',
      severity: 'warning',
      stage: 'thumbnail',
      sourcePath: context.sourcePath,
      photoId: context.photoId,
      message: getScanErrorMessage(error)
    }

    metadataIssues.push(issue.code)
    issues.push(issue)

    return undefined
  }
}
