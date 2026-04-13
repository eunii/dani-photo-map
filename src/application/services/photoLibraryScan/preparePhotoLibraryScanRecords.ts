import type { ScanPhotoLibraryExecuteOptions } from '@application/dto/ScanPhotoLibraryProgress'
import type { ScanPhotoLibraryCommand } from '@application/dto/ScanPhotoLibraryCommand'
import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import type { PhotoMetadata } from '@application/ports/PhotoMetadataReaderPort'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type { Photo } from '@domain/entities/Photo'
import { getPathBaseName, normalizePathSeparators } from '@shared/utils/path'
import { mapWithConcurrencyLimit } from '@shared/utils/mapWithConcurrencyLimit'

import { PREPARE_PHOTO_CONCURRENCY_LIMIT } from './photoLibraryScanConstants'
import { getScanErrorMessage } from './photoLibraryScanIssues'
import type {
  PreparedPhotoRecord,
  PreparedPhotoRecordResult,
  ScanPhotoContext,
  ScanPhotoLibraryDependencies
} from './photoLibraryScanTypes'

async function readMetadataSafely(
  context: ScanPhotoContext,
  issues: ScanPhotoLibraryIssue[],
  dependencies: ScanPhotoLibraryDependencies
): Promise<PhotoMetadata> {
  try {
    return await dependencies.metadataReader.read(context.sourcePath)
  } catch (error) {
    const issue: ScanPhotoLibraryIssue = {
      code: 'metadata-read-failed',
      severity: 'warning',
      stage: 'metadata-read',
      sourcePath: context.sourcePath,
      photoId: context.photoId,
      message: getScanErrorMessage(error)
    }

    issues.push(issue)

    return {
      metadataIssues: [issue.code]
    }
  }
}

async function createSha256Safely(
  context: ScanPhotoContext,
  issues: ScanPhotoLibraryIssue[],
  dependencies: ScanPhotoLibraryDependencies
): Promise<string | null> {
  try {
    return await dependencies.hasher.createSha256(context.sourcePath)
  } catch (error) {
    issues.push({
      code: 'hash-create-failed',
      severity: 'error',
      stage: 'hash',
      sourcePath: context.sourcePath,
      photoId: context.photoId,
      message: getScanErrorMessage(error)
    })

    return null
  }
}

async function resolveRegionNameSafely(
  context: ScanPhotoContext,
  gps: PhotoMetadata['gps'],
  missingGpsCategory: PhotoMetadata['missingGpsCategory'],
  metadataIssues: string[],
  issues: ScanPhotoLibraryIssue[],
  rules: OrganizationRules,
  dependencies: ScanPhotoLibraryDependencies
): Promise<string> {
  if (!gps) {
    return missingGpsCategory === 'capture'
      ? rules.captureRegionLabel
      : rules.unknownRegionLabel
  }

  try {
    return await dependencies.regionResolver.resolveName(gps)
  } catch (error) {
    const issue: ScanPhotoLibraryIssue = {
      code: 'region-resolve-failed',
      severity: 'warning',
      stage: 'region-resolve',
      sourcePath: context.sourcePath,
      photoId: context.photoId,
      message: getScanErrorMessage(error)
    }

    metadataIssues.push(issue.code)
    issues.push(issue)

    return rules.unknownRegionLabel
  }
}

async function preparePhotoRecord(
  context: ScanPhotoContext,
  missingGpsGroupingBasis: ScanPhotoLibraryCommand['missingGpsGroupingBasis'],
  issues: ScanPhotoLibraryIssue[],
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<PreparedPhotoRecord | null> {
  const metadata = await readMetadataSafely(context, issues, dependencies)
  const metadataIssues = [...(metadata.metadataIssues ?? [])]
  const sha256 = await createSha256Safely(context, issues, dependencies)

  if (!sha256) {
    return null
  }

  const regionName = await resolveRegionNameSafely(
    context,
    metadata.gps,
    metadata.missingGpsCategory,
    metadataIssues,
    issues,
    rules,
    dependencies
  )
  const photo: Photo = {
    id: context.photoId,
    sourcePath: context.sourcePath,
    sourceFileName: context.sourceFileName,
    sourceFingerprint: context.sourceFingerprint,
    sha256,
    duplicateOfPhotoId: undefined,
    capturedAt: metadata.capturedAt,
    capturedAtSource: metadata.capturedAtSource,
    originalGps: metadata.originalGps,
    gps: metadata.gps,
    locationSource: metadata.gps ? 'exif' : 'none',
    missingGpsCategory: metadata.missingGpsCategory,
    missingGpsGroupingBasis,
    regionName,
    isDuplicate: false,
    metadataIssues
  }

  return {
    photo,
    context
  }
}

export async function preparePhotoRecords(
  sourcePhotoCandidates: Array<{
    sourcePath: string
    sourceFileName: string
    sourceFingerprint?: Photo['sourceFingerprint']
  }>,
  missingGpsGroupingBasis: ScanPhotoLibraryCommand['missingGpsGroupingBasis'],
  issues: ScanPhotoLibraryIssue[],
  onScanProgress: ScanPhotoLibraryExecuteOptions['onScanProgress'] | undefined,
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<PreparedPhotoRecord[]> {
  let prepareCompleted = 0

  const results = await mapWithConcurrencyLimit(
    sourcePhotoCandidates,
    PREPARE_PHOTO_CONCURRENCY_LIMIT,
    async (candidate, index): Promise<PreparedPhotoRecordResult> => {
      const sourcePath = normalizePathSeparators(candidate.sourcePath)
      const localIssues: ScanPhotoLibraryIssue[] = []

      try {
        return {
          preparedPhotoRecord: await preparePhotoRecord(
            {
              photoId: `photo-${index + 1}`,
              sourcePath,
              sourceFileName: candidate.sourceFileName || getPathBaseName(sourcePath),
              sourceFingerprint: candidate.sourceFingerprint
            },
            missingGpsGroupingBasis,
            localIssues,
            dependencies,
            rules
          ),
          issues: localIssues
        }
      } finally {
        prepareCompleted += 1
        onScanProgress?.({
          kind: 'prepare',
          completed: prepareCompleted,
          total: sourcePhotoCandidates.length
        })
      }
    }
  )

  const preparedPhotoRecords: PreparedPhotoRecord[] = []

  for (const result of results) {
    issues.push(...result.issues)

    if (result.preparedPhotoRecord) {
      preparedPhotoRecords.push(result.preparedPhotoRecord)
    }
  }

  return preparedPhotoRecords
}
