import {
  type ScanPhotoLibraryCommand,
  scanPhotoLibraryCommandSchema
} from '@application/dto/ScanPhotoLibraryCommand'
import type {
  ScanPhotoLibraryIssue,
  ScanPhotoLibraryResult
} from '@application/dto/ScanPhotoLibraryResult'
import type {
  ExistingOutputLibrarySnapshot,
  ExistingOutputScannerPort
} from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import {
  PhotoFileConflictError,
  type PhotoLibraryFileSystemPort
} from '@application/ports/PhotoLibraryFileSystemPort'
import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import type {
  PhotoMetadata,
  PhotoMetadataReaderPort
} from '@application/ports/PhotoMetadataReaderPort'
import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
import { selectCanonicalDuplicatePhoto } from '@domain/services/DuplicatePhotoPolicy'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'
import { buildPhotoOutputRelativePath } from '@domain/services/PhotoNamingService'
import { mergeGroupsByMatchingTitle } from '@application/services/mergeGroupsByMatchingTitle'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import {
  getPathBaseName,
  getPathDirectoryName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

export interface ScanPhotoLibraryDependencies {
  fileSystem: PhotoLibraryFileSystemPort
  metadataReader: PhotoMetadataReaderPort
  hasher: PhotoHasherPort
  regionResolver: RegionResolverPort
  thumbnailGenerator: ThumbnailGeneratorPort
  libraryIndexStore: LibraryIndexStorePort
  existingOutputScanner: ExistingOutputScannerPort
  rules?: OrganizationRules
}

interface ScanPathContext {
  sourceRoot: string
  outputRoot: string
}

interface ScanPhotoContext {
  photoId: string
  sourcePath: string
  sourceFileName: string
}

interface PreparedPhotoRecord {
  photo: Photo
  context: ScanPhotoContext
}

interface FinalizedScanResult {
  copiedPhotos: Photo[]
  copiedCount: number
  duplicateCount: number
  skippedExistingCount: number
}

export class ScanPhotoLibraryUseCase {
  private readonly rules: OrganizationRules

  constructor(private readonly dependencies: ScanPhotoLibraryDependencies) {
    this.rules = dependencies.rules ?? defaultOrganizationRules
  }

  async execute(command: ScanPhotoLibraryCommand): Promise<ScanPhotoLibraryResult> {
    const validatedCommand = scanPhotoLibraryCommandSchema.parse(command)
    const paths = this.createScanPathContext(validatedCommand)
    const issues: ScanPhotoLibraryIssue[] = []
    const existingOutputSnapshot = await this.dependencies.existingOutputScanner.scan(
      paths.outputRoot
    )
    const storedIndex = await this.loadStoredLibraryIndexSafely(paths.outputRoot)
    const existingOutputHashes = await this.createExistingOutputHashes(
      existingOutputSnapshot,
      issues
    )

    const photoPaths = await this.dependencies.fileSystem.listPhotoFiles(
      paths.sourceRoot
    )
    const preparedPhotoRecords: PreparedPhotoRecord[] = []

    await this.prepareOutputDirectories(paths.outputRoot)

    for (const [index, listedPhotoPath] of photoPaths.entries()) {
      const sourcePath = normalizePathSeparators(listedPhotoPath)
      const preparedPhotoRecord = await this.preparePhotoRecord(
        {
          photoId: `photo-${index + 1}`,
          sourcePath,
          sourceFileName: getPathBaseName(sourcePath)
        },
        issues
      )

      if (preparedPhotoRecord) {
        preparedPhotoRecords.push(preparedPhotoRecord)
      }
    }

    const photoIdToGroupKey = this.computePhotoIdToGroupKeyMap(
      preparedPhotoRecords,
      validatedCommand.pendingCustomGroupSplits ?? [],
      validatedCommand.defaultTitleManualPhotoIds ?? []
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
            skippedExistingCount: 0
          }
        : await this.finalizePreparedPhotos(
            preparedPhotoRecords,
            paths.outputRoot,
            existingOutputHashes,
            issues,
            copyFilter
          )
    const index = await this.buildMergedLibraryIndex(
      paths,
      existingOutputSnapshot,
      storedIndex,
      finalizedScanResult.copiedPhotos,
      validatedCommand.groupMetadataOverrides ?? [],
      validatedCommand.pendingGroupAssignments ?? [],
      validatedCommand.pendingCustomGroupSplits ?? [],
      validatedCommand.defaultTitleManualPhotoIds ?? []
    )
    const groups = index.groups

    await this.dependencies.libraryIndexStore.save(index)

    return {
      scannedCount: photoPaths.length,
      duplicateCount: finalizedScanResult.duplicateCount,
      keptCount: finalizedScanResult.copiedCount,
      copiedCount: finalizedScanResult.copiedCount,
      skippedExistingCount: finalizedScanResult.skippedExistingCount,
      groupCount: groups.length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
      failureCount: issues.filter((issue) => issue.severity === 'error').length,
      issues,
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

  private createScanPathContext(command: ScanPhotoLibraryCommand): ScanPathContext {
    return {
      sourceRoot: normalizePathSeparators(command.sourceRoot),
      outputRoot: normalizePathSeparators(command.outputRoot)
    }
  }

  private async prepareOutputDirectories(outputRoot: string): Promise<void> {
    try {
      await this.dependencies.fileSystem.ensureDirectory(outputRoot)
      await this.dependencies.fileSystem.ensureDirectory(
        joinPathSegments(outputRoot, this.rules.outputThumbnailsRelativePath)
      )
    } catch (error) {
      throw new Error(
        `Failed to prepare output directories under ${outputRoot}: ${this.getErrorMessage(error)}`
      )
    }
  }

  private async preparePhotoRecord(
    context: ScanPhotoContext,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<PreparedPhotoRecord | null> {
    const metadata = await this.readMetadataSafely(context, issues)
    const metadataIssues = [...(metadata.metadataIssues ?? [])]
    const sha256 = await this.createSha256Safely(context, issues)

    if (!sha256) {
      return null
    }

    const regionName = await this.resolveRegionNameSafely(
      context,
      metadata.gps,
      metadata.missingGpsCategory,
      metadataIssues,
      issues
    )
    const outputRelativePath = buildPhotoOutputRelativePath(
      {
        capturedAt: metadata.capturedAt,
        gps: metadata.gps,
        regionName,
        missingGpsCategory: metadata.missingGpsCategory,
        sourceFileName: context.sourceFileName
      },
      this.rules
    )
    const photo: Photo = {
      id: context.photoId,
      sourcePath: context.sourcePath,
      sourceFileName: context.sourceFileName,
      sha256,
      duplicateOfPhotoId: undefined,
      capturedAt: metadata.capturedAt,
      capturedAtSource: metadata.capturedAtSource,
      originalGps: metadata.originalGps,
      gps: metadata.gps,
      locationSource: metadata.gps ? 'exif' : 'none',
      missingGpsCategory: metadata.missingGpsCategory,
      regionName,
      outputRelativePath,
      isDuplicate: false,
      metadataIssues
    }

    return {
      photo,
      context
    }
  }

  private computePhotoIdToGroupKeyMap(
    preparedPhotoRecords: PreparedPhotoRecord[],
    pendingCustomGroupSplits: Array<{
      groupKey: string
      splitId: string
      title: string
      photoIds: string[]
    }>,
    defaultTitleManualPhotoIds: Array<{
      photoId: string
      title: string
    }>
  ): Map<string, string> {
    const photos = preparedPhotoRecords.map((record) => ({ ...record.photo }))
    const afterSplits = this.applyPendingCustomGroupSplits(
      photos,
      pendingCustomGroupSplits
    )
    const afterManual = this.applyDefaultTitleManualGrouping(
      afterSplits,
      defaultTitleManualPhotoIds
    )
    const map = new Map<string, string>()

    for (const group of createPhotoGroups(afterManual)) {
      for (const photoId of group.photoIds) {
        map.set(photoId, group.groupKey)
      }
    }

    return map
  }

  private async finalizePreparedPhotos(
    preparedPhotoRecords: PreparedPhotoRecord[],
    outputRoot: string,
    existingOutputHashes: Set<string>,
    issues: ScanPhotoLibraryIssue[],
    copyFilter?: {
      keys: Set<string>
      photoIdToGroupKey: Map<string, string>
    }
  ): Promise<FinalizedScanResult> {
    const photosForCanonical = copyFilter?.keys.size
      ? preparedPhotoRecords
          .filter((record) => {
            const key = copyFilter.photoIdToGroupKey.get(record.photo.id)

            return key !== undefined && copyFilter.keys.has(key)
          })
          .map((record) => record.photo)
      : preparedPhotoRecords.map((record) => record.photo)
    const canonicalPhotoIdByHash =
      this.createCanonicalPhotoIdByHash(photosForCanonical)
    const copiedPhotos: Photo[] = []
    let duplicateCount = 0
    let skippedExistingCount = 0

    for (const preparedPhotoRecord of preparedPhotoRecords) {
      if (copyFilter?.keys.size) {
        const groupKey = copyFilter.photoIdToGroupKey.get(
          preparedPhotoRecord.photo.id
        )

        if (groupKey === undefined || !copyFilter.keys.has(groupKey)) {
          continue
        }
      }

      const finalizedPhoto = await this.finalizePreparedPhoto(
        preparedPhotoRecord,
        outputRoot,
        canonicalPhotoIdByHash,
        existingOutputHashes,
        issues
      )

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
      skippedExistingCount
    }
  }

  private createCanonicalPhotoIdByHash(photos: Photo[]): Map<string, string> {
    const photosByHash = new Map<string, Photo[]>()

    for (const photo of photos) {
      if (!photo.sha256) {
        continue
      }

      const duplicateSet = photosByHash.get(photo.sha256) ?? []

      duplicateSet.push(photo)
      photosByHash.set(photo.sha256, duplicateSet)
    }

    return new Map(
      Array.from(photosByHash.entries())
        .map(([sha256, duplicateSet]) => {
          const canonicalPhoto = selectCanonicalDuplicatePhoto(duplicateSet)

          return canonicalPhoto ? ([sha256, canonicalPhoto.id] as const) : null
        })
        .filter((entry): entry is readonly [string, string] => entry !== null)
    )
  }

  private async finalizePreparedPhoto(
    preparedPhotoRecord: PreparedPhotoRecord,
    outputRoot: string,
    canonicalPhotoIdByHash: Map<string, string>,
    existingOutputHashes: Set<string>,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<Photo | 'duplicate' | 'existing-output-duplicate' | null> {
    const photo = {
      ...preparedPhotoRecord.photo
    }
    const canonicalPhotoId = photo.sha256
      ? canonicalPhotoIdByHash.get(photo.sha256)
      : undefined

    photo.isDuplicate = Boolean(canonicalPhotoId && canonicalPhotoId !== photo.id)
    photo.duplicateOfPhotoId = photo.isDuplicate ? canonicalPhotoId : undefined

    if (photo.isDuplicate) {
      return 'duplicate'
    }

    if (photo.sha256 && existingOutputHashes.has(photo.sha256)) {
      return 'existing-output-duplicate'
    }

    if (photo.outputRelativePath) {
      const copySucceeded = await this.copyPhotoToOutput(outputRoot, photo, issues)

      if (!copySucceeded) {
        return null
      }

      photo.thumbnailRelativePath = await this.generateThumbnailSafely(
        preparedPhotoRecord.context,
        photo.metadataIssues,
        issues
      )
    }

    return photo
  }

  private async loadStoredLibraryIndexSafely(
    outputRoot: string
  ): Promise<LibraryIndex | null> {
    try {
      return await this.dependencies.libraryIndexStore.load(outputRoot)
    } catch {
      return null
    }
  }

  private async createExistingOutputHashes(
    snapshot: ExistingOutputLibrarySnapshot,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<Set<string>> {
    const hashes = new Set<string>()

    for (const existingPhoto of snapshot.photos) {
      try {
        hashes.add(await this.dependencies.hasher.createSha256(existingPhoto.sourcePath))
      } catch (error) {
        issues.push(
          this.createIssue({
            code: 'existing-output-hash-failed',
            severity: 'warning',
            stage: 'hash',
            sourcePath: existingPhoto.sourcePath,
            photoId: existingPhoto.id,
            outputRelativePath: existingPhoto.outputRelativePath,
            message: this.getErrorMessage(error)
          })
        )
      }
    }

    return hashes
  }

  private async buildMergedLibraryIndex(
    paths: ScanPathContext,
    existingOutputSnapshot: ExistingOutputLibrarySnapshot,
    storedIndex: LibraryIndex | null,
    copiedPhotos: Photo[],
    groupMetadataOverrides: Array<{
      groupKey: string
      title: string
      companions: string[]
      notes?: string
    }>,
    pendingGroupAssignments: Array<{
      groupKey: string
      targetGroupId: string
    }>,
    pendingCustomGroupSplits: Array<{
      groupKey: string
      splitId: string
      title: string
      photoIds: string[]
    }>,
    defaultTitleManualPhotoIds: Array<{
      photoId: string
      title: string
    }>
  ): Promise<LibraryIndex> {
    const rebuiltExistingIndex = rebuildLibraryIndexFromExistingOutput(
      existingOutputSnapshot
    )
    const mergedBasePhotos = rebuiltExistingIndex?.photos ?? []
    const afterSplits = this.applyPendingCustomGroupSplits(
      copiedPhotos,
      pendingCustomGroupSplits
    )
    const customizedCopiedPhotos = this.applyDefaultTitleManualGrouping(
      afterSplits,
      defaultTitleManualPhotoIds
    )
    const rebuiltIndex: LibraryIndex = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: new Date().toISOString(),
      sourceRoot: paths.sourceRoot,
      outputRoot: paths.outputRoot,
      photos: [...mergedBasePhotos, ...customizedCopiedPhotos],
      groups: createPhotoGroups([...mergedBasePhotos, ...customizedCopiedPhotos])
    }

    const metadataAppliedIndex = this.applyGroupMetadataOverrides(
      mergeStoredLibraryMetadata(rebuiltIndex, storedIndex),
      customizedCopiedPhotos,
      groupMetadataOverrides
    )

    const afterAssignments = await this.applyPendingGroupAssignments(
      metadataAppliedIndex,
      customizedCopiedPhotos,
      paths.outputRoot,
      pendingGroupAssignments
    )

    return mergeGroupsByMatchingTitle({
      index: afterAssignments,
      outputRoot: paths.outputRoot,
      fileSystem: this.dependencies.fileSystem,
      rules: this.rules
    })
  }

  private applyPendingCustomGroupSplits(
    copiedPhotos: Photo[],
    pendingCustomGroupSplits: Array<{
      groupKey: string
      splitId: string
      title: string
      photoIds: string[]
    }>
  ): Photo[] {
    if (copiedPhotos.length === 0 || pendingCustomGroupSplits.length === 0) {
      return copiedPhotos
    }

    const pendingPhotoIdsByGroupKey = new Map<string, Set<string>>()

    for (const group of createPhotoGroups(copiedPhotos)) {
      pendingPhotoIdsByGroupKey.set(group.groupKey, new Set(group.photoIds))
    }

    const splitByPhotoId = new Map<
      string,
      {
        splitId: string
        title: string
      }
    >()

    for (const split of pendingCustomGroupSplits) {
      const allowedPhotoIds = pendingPhotoIdsByGroupKey.get(split.groupKey)
      const normalizedTitle = split.title.trim()

      if (!allowedPhotoIds || normalizedTitle.length === 0) {
        continue
      }

      for (const photoId of split.photoIds) {
        if (!allowedPhotoIds.has(photoId) || splitByPhotoId.has(photoId)) {
          continue
        }

        splitByPhotoId.set(photoId, {
          splitId: split.splitId,
          title: normalizedTitle
        })
      }
    }

    return copiedPhotos.map((photo) => {
      const split = splitByPhotoId.get(photo.id)

      return split
        ? {
            ...photo,
            manualGroupId: split.splitId,
            manualGroupTitle: split.title
          }
        : photo
    })
  }

  private normalizeDefaultGroupTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ')
  }

  private applyDefaultTitleManualGrouping(
    photos: Photo[],
    entries: Array<{
      photoId: string
      title: string
    }>
  ): Photo[] {
    if (photos.length === 0 || entries.length === 0) {
      return photos
    }

    const normalizedToManualId = new Map<string, string>()
    const normalizedToDisplayTitle = new Map<string, string>()

    for (const entry of entries) {
      const normalized = this.normalizeDefaultGroupTitle(entry.title)

      if (normalized.length === 0) {
        continue
      }

      if (!normalizedToManualId.has(normalized)) {
        normalizedToManualId.set(
          normalized,
          `manual-default-title|${encodeURIComponent(normalized)}`
        )
        normalizedToDisplayTitle.set(normalized, entry.title.trim())
      }
    }

    const photoIdToNormalized = new Map<string, string>()

    for (const entry of entries) {
      const normalized = this.normalizeDefaultGroupTitle(entry.title)

      if (normalized.length === 0) {
        continue
      }

      photoIdToNormalized.set(entry.photoId, normalized)
    }

    return photos.map((photo) => {
      if (photo.manualGroupId) {
        return photo
      }

      const normalized = photoIdToNormalized.get(photo.id)

      if (!normalized) {
        return photo
      }

      const manualGroupId = normalizedToManualId.get(normalized)
      const manualGroupTitle = normalizedToDisplayTitle.get(normalized)

      if (!manualGroupId || !manualGroupTitle) {
        return photo
      }

      return {
        ...photo,
        manualGroupId,
        manualGroupTitle
      }
    })
  }

  private applyGroupMetadataOverrides(
    index: LibraryIndex,
    copiedPhotos: Photo[],
    groupMetadataOverrides: Array<{
      groupKey: string
      title: string
      companions: string[]
      notes?: string
    }>
  ): LibraryIndex {
    if (copiedPhotos.length === 0 || groupMetadataOverrides.length === 0) {
      return index
    }

    const overrideByPendingGroupKey = new Map(
      groupMetadataOverrides
        .map((override) => [
          override.groupKey,
          {
            title: override.title.trim(),
            companions: Array.from(
              new Set(
                override.companions
                  .map((companion) => companion.trim())
                  .filter((companion) => companion.length > 0)
              )
            ),
            notes: override.notes?.trim() || undefined
          }
        ] as const)
        .filter((entry) => entry[1].title.length > 0)
    )

    if (overrideByPendingGroupKey.size === 0) {
      return index
    }

    const pendingGroups = createPhotoGroups(copiedPhotos)
    const pendingGroupKeyByPhotoId = new Map<string, string>()

    for (const group of pendingGroups) {
      for (const photoId of group.photoIds) {
        pendingGroupKeyByPhotoId.set(photoId, group.groupKey)
      }
    }

    return {
      ...index,
      groups: index.groups.map((group) => {
        const override = group.photoIds
          .map((photoId) => pendingGroupKeyByPhotoId.get(photoId))
          .map((pendingGroupKey) =>
            pendingGroupKey
              ? overrideByPendingGroupKey.get(pendingGroupKey)
              : undefined
          )
          .find((value) => Boolean(value))

        return override
          ? {
              ...group,
              title: override.title,
              companions: override.companions,
              notes: override.notes
            }
          : group
      })
    }
  }

  private async applyPendingGroupAssignments(
    index: LibraryIndex,
    _copiedPhotos: Photo[],
    outputRoot: string,
    pendingGroupAssignments: Array<{
      groupKey: string
      targetGroupId: string
    }>
  ): Promise<LibraryIndex> {
    if (pendingGroupAssignments.length === 0) {
      return index
    }

    let nextIndex = index

    for (const assignment of pendingGroupAssignments) {
      const sourceGroup = nextIndex.groups.find(
        (group) => group.groupKey === assignment.groupKey
      )

      if (!sourceGroup || sourceGroup.photoIds.length === 0) {
        continue
      }

      const destinationGroup = nextIndex.groups.find(
        (group) => group.id === assignment.targetGroupId
      )

      if (!destinationGroup) {
        continue
      }

      nextIndex = await movePhotosIntoGroup({
        index: nextIndex,
        outputRoot,
        sourceGroupId: sourceGroup.id,
        destinationGroupId: assignment.targetGroupId,
        photoIds: sourceGroup.photoIds,
        fileSystem: this.dependencies.fileSystem,
        rules: this.rules,
        allowDestinationWithoutGps: !destinationGroup.representativeGps
      })
    }

    return nextIndex
  }

  private async readMetadataSafely(
    context: ScanPhotoContext,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<PhotoMetadata> {
    try {
      return await this.dependencies.metadataReader.read(context.sourcePath)
    } catch (error) {
      const issue = this.createIssue({
        code: 'metadata-read-failed',
        severity: 'warning',
        stage: 'metadata-read',
        sourcePath: context.sourcePath,
        photoId: context.photoId,
        message: this.getErrorMessage(error)
      })

      issues.push(issue)

      return {
        metadataIssues: [issue.code]
      }
    }
  }

  private async createSha256Safely(
    context: ScanPhotoContext,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<string | null> {
    try {
      return await this.dependencies.hasher.createSha256(context.sourcePath)
    } catch (error) {
      issues.push(
        this.createIssue({
          code: 'hash-create-failed',
          severity: 'error',
          stage: 'hash',
          sourcePath: context.sourcePath,
          photoId: context.photoId,
          message: this.getErrorMessage(error)
        })
      )

      return null
    }
  }

  private async resolveRegionNameSafely(
    context: ScanPhotoContext,
    gps: PhotoMetadata['gps'],
    missingGpsCategory: PhotoMetadata['missingGpsCategory'],
    metadataIssues: string[],
    issues: ScanPhotoLibraryIssue[]
  ): Promise<string> {
    if (!gps) {
      return missingGpsCategory === 'capture'
        ? this.rules.captureRegionLabel
        : this.rules.unknownRegionLabel
    }

    try {
      return await this.dependencies.regionResolver.resolveName(gps)
    } catch (error) {
      const issue = this.createIssue({
        code: 'region-resolve-failed',
        severity: 'warning',
        stage: 'region-resolve',
        sourcePath: context.sourcePath,
        photoId: context.photoId,
        message: this.getErrorMessage(error)
      })

      metadataIssues.push(issue.code)
      issues.push(issue)

      return this.rules.unknownRegionLabel
    }
  }

  private async copyPhotoToOutput(
    outputRoot: string,
    photo: Pick<Photo, 'id' | 'sourcePath' | 'outputRelativePath'>,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<boolean> {
    if (!photo.outputRelativePath) {
      return true
    }

    const destinationPath = joinPathSegments(outputRoot, photo.outputRelativePath)
    const destinationDirectory = getPathDirectoryName(destinationPath)

    try {
      await this.dependencies.fileSystem.ensureDirectory(destinationDirectory)
      await this.dependencies.fileSystem.copyFile(photo.sourcePath, destinationPath)

      return true
    } catch (error) {
      if (error instanceof PhotoFileConflictError) {
        issues.push(
          this.createIssue({
            code: 'copy-destination-conflict',
            severity: 'error',
            stage: 'copy',
            sourcePath: photo.sourcePath,
            photoId: photo.id,
            outputRelativePath: photo.outputRelativePath,
            destinationPath: error.destinationPath,
            message: error.message
          })
        )

        return false
      }

      issues.push(
        this.createIssue({
          code: 'copy-failed',
          severity: 'error',
          stage: 'copy',
          sourcePath: photo.sourcePath,
          photoId: photo.id,
          outputRelativePath: photo.outputRelativePath,
          destinationPath,
          message: this.getErrorMessage(error)
        })
      )

      return false
    }
  }

  private async generateThumbnailSafely(
    context: ScanPhotoContext,
    metadataIssues: string[],
    issues: ScanPhotoLibraryIssue[]
  ): Promise<string | undefined> {
    try {
      const thumbnailPath = await this.dependencies.thumbnailGenerator.generateForPhoto(
        context.sourcePath
      )

      return joinPathSegments(this.rules.outputThumbnailsRelativePath, thumbnailPath)
    } catch (error) {
      const issue = this.createIssue({
        code: 'thumbnail-generation-failed',
        severity: 'warning',
        stage: 'thumbnail',
        sourcePath: context.sourcePath,
        photoId: context.photoId,
        message: this.getErrorMessage(error)
      })

      metadataIssues.push(issue.code)
      issues.push(issue)

      return undefined
    }
  }

  private createIssue(issue: ScanPhotoLibraryIssue): ScanPhotoLibraryIssue {
    return issue
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
  }
}
