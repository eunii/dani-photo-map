import type { ScanPhotoLibraryExecuteOptions } from '@application/dto/ScanPhotoLibraryProgress'
import {
  type ScanPhotoLibraryCommand,
  scanPhotoLibraryCommandSchema
} from '@application/dto/ScanPhotoLibraryCommand'
import type {
  ScanPhotoLibraryIssue,
  ScanPhotoLibraryResult
} from '@application/dto/ScanPhotoLibraryResult'
import { buildExistingOutputHashSet } from '@application/services/buildExistingOutputHashSet'
import { buildIncrementalSourcePhotoCandidates } from '@application/services/buildIncrementalSourcePhotoCandidates'
import { computeGroupingMaps, buildPhotoIdToGroupFileLabelMap } from '@application/services/photoLibraryScan/computePhotoLibraryScanGrouping'
import { EXISTING_OUTPUT_HASH_CONCURRENCY_LIMIT } from '@application/services/photoLibraryScan/photoLibraryScanConstants'
import { getScanErrorMessage } from '@application/services/photoLibraryScan/photoLibraryScanIssues'
import type { ScanPhotoLibraryDependencies } from '@application/services/photoLibraryScan/photoLibraryScanTypes'
import { finalizePreparedPhotos } from '@application/services/photoLibraryScan/finalizePhotoLibraryScan'
import {
  buildMergedLibraryIndex,
  loadStoredLibraryIndexSafely
} from '@application/services/photoLibraryScan/mergePhotoLibraryIndexAfterScan'
import { preparePhotoRecords } from '@application/services/photoLibraryScan/preparePhotoLibraryScanRecords'
import {
  createScanPathContext,
  prepareOutputDirectories
} from '@application/services/photoLibraryScan/scanOutputPathSetup'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
import type { Photo } from '@domain/entities/Photo'

export type { ScanPhotoLibraryDependencies } from '@application/services/photoLibraryScan/photoLibraryScanTypes'

export class ScanPhotoLibraryUseCase {
  private readonly rules: OrganizationRules

  constructor(private readonly dependencies: ScanPhotoLibraryDependencies) {
    this.rules = dependencies.rules ?? defaultOrganizationRules
  }

  async execute(
    command: ScanPhotoLibraryCommand,
    options?: ScanPhotoLibraryExecuteOptions
  ): Promise<ScanPhotoLibraryResult> {
    const validatedCommand = scanPhotoLibraryCommandSchema.parse(command)
    const onScanProgress = options?.onScanProgress
    const paths = createScanPathContext(validatedCommand)
    const issues: ScanPhotoLibraryIssue[] = []
    const existingOutputSnapshot = await this.dependencies.existingOutputScanner.scan(
      paths.outputRoot
    )
    const storedIndex = await loadStoredLibraryIndexSafely(
      paths.outputRoot,
      this.dependencies.libraryIndexStore
    )
    const { hashes: existingOutputHashes, hashToOutputRelativePath } =
      await buildExistingOutputHashSet({
        snapshot: existingOutputSnapshot,
        storedIndex,
        hasher: this.dependencies.hasher,
        hashConcurrencyLimit: EXISTING_OUTPUT_HASH_CONCURRENCY_LIMIT,
        onDiskHashFailure: ({ sourcePath, photoId, outputRelativePath, error }) => {
          issues.push({
            code: 'existing-output-hash-failed',
            severity: 'warning',
            stage: 'hash',
            sourcePath,
            photoId,
            outputRelativePath,
            message: getScanErrorMessage(error)
          })
        }
      })

    const listedPhotoPaths = await this.dependencies.fileSystem.listPhotoFiles(
      paths.sourceRoot
    )
    const {
      candidates: sourcePhotoCandidates,
      skippedUnchangedCount,
      skippedUnchangedDetails
    } =
      await buildIncrementalSourcePhotoCandidates({
        listedPhotoPaths,
        sourceRoot: paths.sourceRoot,
        storedIndex,
        fileSystem: this.dependencies.fileSystem
      })

    await prepareOutputDirectories(
      paths.outputRoot,
      this.dependencies.fileSystem,
      this.rules
    )
    const preparedPhotoRecords = await preparePhotoRecords(
      sourcePhotoCandidates,
      validatedCommand.missingGpsGroupingBasis,
      issues,
      onScanProgress,
      this.dependencies,
      this.rules
    )

    const { photoIdToGroupKey, photoIdToDisplayTitle } = computeGroupingMaps(
      preparedPhotoRecords,
      validatedCommand.missingGpsGroupingBasis,
      validatedCommand.pendingCustomGroupSplits ?? [],
      validatedCommand.defaultTitleManualPhotoIds ?? []
    )
    const photoIdToGroupFileLabel = buildPhotoIdToGroupFileLabelMap(
      preparedPhotoRecords,
      photoIdToGroupKey,
      photoIdToDisplayTitle,
      validatedCommand.groupMetadataOverrides ?? [],
      this.rules
    )
    const copyKeys = validatedCommand.copyGroupKeysInThisRun
    const copyFilter =
      copyKeys !== undefined
        ? { keys: new Set(copyKeys), photoIdToGroupKey }
        : undefined

    const finalizedScanResult =
      copyKeys !== undefined && copyKeys.length === 0
        ? {
            copiedPhotos: [] as Photo[],
            copiedCount: 0,
            duplicateCount: 0,
            skippedExistingCount: 0,
            inBatchDuplicateDetails: [],
            existingOutputSkipDetails: []
          }
        : await finalizePreparedPhotos(
            preparedPhotoRecords,
            paths.outputRoot,
            existingOutputHashes,
            hashToOutputRelativePath,
            issues,
            copyFilter,
            photoIdToGroupFileLabel,
            onScanProgress,
            this.dependencies,
            this.rules
          )
    const index = await buildMergedLibraryIndex(
      paths,
      existingOutputSnapshot,
      storedIndex,
      finalizedScanResult.copiedPhotos,
      validatedCommand.groupMetadataOverrides ?? [],
      validatedCommand.pendingGroupAssignments ?? [],
      validatedCommand.pendingCustomGroupSplits ?? [],
      validatedCommand.defaultTitleManualPhotoIds ?? [],
      this.dependencies,
      this.rules
    )
    const groups = index.groups

    await this.dependencies.libraryIndexStore.save(index)

    return {
      scannedCount: listedPhotoPaths.length,
      skippedUnchangedCount,
      duplicateCount: finalizedScanResult.duplicateCount,
      keptCount: finalizedScanResult.copiedCount,
      copiedCount: finalizedScanResult.copiedCount,
      skippedExistingCount: finalizedScanResult.skippedExistingCount,
      skippedUnchangedDetails,
      groupCount: groups.length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
      failureCount: issues.filter((issue) => issue.severity === 'error').length,
      issues,
      inBatchDuplicateDetails: finalizedScanResult.inBatchDuplicateDetails,
      existingOutputSkipDetails: finalizedScanResult.existingOutputSkipDetails,
      mapGroups: groups
        .filter((group) => group.representativeGps)
        .map((group) => ({
          id: group.id,
          title: group.title,
          photoCount: group.photoIds.length,
          latitude: group.representativeGps!.latitude,
          longitude: group.representativeGps!.longitude
        }))
    }
  }
}
