import type {
  FileOutcomePayload,
  ScanPhotoLibraryExecuteOptions
} from '@application/dto/ScanPhotoLibraryProgress'
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
import { isVideoLibraryFileName } from '@shared/constants/mediaExtensions'
import { appLog } from '@shared/logging/appLog'
import {
  getPathDirectoryName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

import { getScanErrorMessage } from './photoLibraryScanIssues'
import type {
  FinalizedScanResult,
  PreparedPhotoRecord,
  ScanPhotoContext,
  ScanPhotoLibraryDependencies
} from './photoLibraryScanTypes'

export interface CopyPhotoFilter {
  keys?: Set<string>
  photoIdToGroupKey?: Map<string, string>
  sourcePaths?: Set<string>
}

function photoRecordMatchesCopyFilter(
  record: PreparedPhotoRecord,
  copyFilter: CopyPhotoFilter | undefined
): boolean {
  if (!copyFilter) {
    return true
  }

  if (copyFilter.sourcePaths && copyFilter.sourcePaths.size > 0) {
    return copyFilter.sourcePaths.has(
      normalizePathSeparators(record.photo.sourcePath)
    )
  }

  if (copyFilter.keys && copyFilter.keys.size > 0 && copyFilter.photoIdToGroupKey) {
    const groupKey = copyFilter.photoIdToGroupKey.get(record.photo.id)

    return groupKey !== undefined && copyFilter.keys.has(groupKey)
  }

  if (
    (copyFilter.sourcePaths && copyFilter.sourcePaths.size === 0) ||
    (copyFilter.keys && copyFilter.keys.size === 0)
  ) {
    return false
  }

  return true
}

function logCopyAuditSkip(sourcePath: string, reason: string): void {
  appLog('info', `copy-audit skip: ${sourcePath} | ${reason}`)
}

function logCopyAuditCopied(sourcePath: string, destinationPath: string): void {
  appLog('info', `copy-audit copied: ${sourcePath} -> ${destinationPath}`)
}

export async function finalizePreparedPhotos(
  preparedPhotoRecords: PreparedPhotoRecord[],
  outputRoot: string,
  existingOutputHashes: Set<string>,
  existingOutputHashToPath: Map<string, string>,
  issues: ScanPhotoLibraryIssue[],
  copyFilter: CopyPhotoFilter | undefined,
  photoIdToGroupFileLabel: Map<string, string>,
  onScanProgress: ScanPhotoLibraryExecuteOptions['onScanProgress'] | undefined,
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules,
  onFileOutcome?: ScanPhotoLibraryExecuteOptions['onFileOutcome']
): Promise<FinalizedScanResult> {
  const photosForCanonical = preparedPhotoRecords
    .filter((record) => photoRecordMatchesCopyFilter(record, copyFilter))
    .map((record) => record.photo)
  const canonicalPhotoIdByHash = createCanonicalPhotoIdByHash(photosForCanonical)
  const copiedPhotos: Photo[] = []
  let duplicateCount = 0
  let skippedExistingCount = 0
  const inBatchDuplicateDetails: InBatchDuplicateDetail[] = []
  const existingOutputSkipDetails: ExistingOutputSkipDetail[] = []

  const recordsToFinalize = preparedPhotoRecords.filter((record) =>
    photoRecordMatchesCopyFilter(record, copyFilter)
  )

  const notInThisRunCount =
    preparedPhotoRecords.length - recordsToFinalize.length

  if (notInThisRunCount > 0) {
    appLog(
      'info',
      `copy-audit skip-count: 이번 저장 대상이 아닌 파일 ${notInThisRunCount}개`
    )
  }

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
    onFileOutcome?.(toFileOutcomePayload(preparedPhotoRecord, finalizedPhoto, issues))

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

  appLog(
    'info',
    `copy-audit summary copied=${copiedPhotos.length} inBatchDuplicate=${duplicateCount} existingSkip=${skippedExistingCount} notInThisRun=${notInThisRunCount}`
  )

  return {
    copiedPhotos,
    copiedCount: copiedPhotos.length,
    duplicateCount,
    skippedExistingCount,
    inBatchDuplicateDetails,
    existingOutputSkipDetails
  }
}

function toFileOutcomePayload(
  preparedPhotoRecord: PreparedPhotoRecord,
  finalizedPhoto: Photo | 'duplicate' | 'existing-output-duplicate' | null,
  issues: ScanPhotoLibraryIssue[]
): FileOutcomePayload {
  const sourcePath = preparedPhotoRecord.context.sourcePath
  const sourceFileName = preparedPhotoRecord.photo.sourceFileName
  const photoId = preparedPhotoRecord.photo.id

  if (finalizedPhoto === 'duplicate') {
    return { sourcePath, sourceFileName, status: 'duplicate', photoId }
  }

  if (finalizedPhoto === 'existing-output-duplicate') {
    return { sourcePath, sourceFileName, status: 'existing-output-duplicate', photoId }
  }

  if (finalizedPhoto) {
    return {
      sourcePath,
      sourceFileName,
      status: 'saved',
      photoId,
      outputRelativePath: finalizedPhoto.outputRelativePath
    }
  }

  const matchingIssue = [...issues]
    .reverse()
    .find((issue) => issue.sourcePath === sourcePath && issue.severity === 'error')

  return {
    sourcePath,
    sourceFileName,
    status: 'failed',
    photoId,
    message: matchingIssue?.message
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
    logCopyAuditSkip(
      preparedPhotoRecord.context.sourcePath,
      `이번 배치 안 중복 (이미 복사하는 원본: ${canonicalRecord?.context.sourcePath ?? canonicalPhotoId})`
    )

    return 'duplicate'
  }

  if (photo.sha256 && existingOutputHashes.has(photo.sha256)) {
    const existingOutputRelativePath =
      existingOutputHashToPath.get(photo.sha256) ?? ''
    existingOutputSkipDetails.push({
      sourcePhotoId: photo.id,
      sourcePath: preparedPhotoRecord.context.sourcePath,
      sha256: photo.sha256,
      existingOutputRelativePath
    })
    logCopyAuditSkip(
      preparedPhotoRecord.context.sourcePath,
      `출력 폴더에 같은 파일이 이미 있음 (${existingOutputRelativePath || '경로 없음'})`
    )

    return 'existing-output-duplicate'
  }

  if (!photo.outputRelativePath) {
    logCopyAuditSkip(
      preparedPhotoRecord.context.sourcePath,
      '출력 경로를 만들지 못해 물리 복사를 하지 않음'
    )
    return null
  }

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

  return photo
}

async function copyPhotoToOutput(
  outputRoot: string,
  photo: Pick<Photo, 'id' | 'sourcePath' | 'outputRelativePath'>,
  issues: ScanPhotoLibraryIssue[],
  fileSystem: PhotoLibraryFileSystemPort
): Promise<boolean> {
  if (!photo.outputRelativePath) {
    logCopyAuditSkip(
      photo.sourcePath,
      '출력 경로가 없어 물리 복사를 하지 않음'
    )
    return false
  }

  const destinationPath = joinPathSegments(outputRoot, photo.outputRelativePath)
  const destinationDirectory = getPathDirectoryName(destinationPath)

  try {
    await fileSystem.ensureDirectory(destinationDirectory)
    await fileSystem.copyFile(photo.sourcePath, destinationPath)
    logCopyAuditCopied(photo.sourcePath, destinationPath)

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
      logCopyAuditSkip(
        photo.sourcePath,
        `대상에 같은 이름 파일이 이미 있어 복사 실패 (${error.destinationPath})`
      )

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
    logCopyAuditSkip(
      photo.sourcePath,
      `복사 실패 dest=${destinationPath} (${getScanErrorMessage(error)})`
    )

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
  if (isVideoLibraryFileName(context.sourcePath)) {
    return undefined
  }

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
    appLog('warn', `scan skip thumbnail: ${context.sourcePath}`, error)

    return undefined
  }
}
