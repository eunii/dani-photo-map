import {
  type ScanPhotoLibraryCommand,
  scanPhotoLibraryCommandSchema
} from '@application/dto/ScanPhotoLibraryCommand'
import type {
  ScanPhotoLibraryIssue,
  ScanPhotoLibraryResult
} from '@application/dto/ScanPhotoLibraryResult'
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

export class ScanPhotoLibraryUseCase {
  private readonly rules: OrganizationRules

  constructor(private readonly dependencies: ScanPhotoLibraryDependencies) {
    this.rules = dependencies.rules ?? defaultOrganizationRules
  }

  async execute(command: ScanPhotoLibraryCommand): Promise<ScanPhotoLibraryResult> {
    const validatedCommand = scanPhotoLibraryCommandSchema.parse(command)
    const paths = this.createScanPathContext(validatedCommand)
    const issues: ScanPhotoLibraryIssue[] = []

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

    const photos = await this.finalizePreparedPhotos(
      preparedPhotoRecords,
      paths.outputRoot,
      issues
    )

    const groups = createPhotoGroups(photos)
    const index: LibraryIndex = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: new Date().toISOString(),
      sourceRoot: paths.sourceRoot,
      outputRoot: paths.outputRoot,
      photos,
      groups
    }

    await this.dependencies.libraryIndexStore.save(index)

    return {
      scannedCount: photoPaths.length,
      duplicateCount: photos.filter((photo) => photo.isDuplicate).length,
      keptCount: photos.filter((photo) => !photo.isDuplicate).length,
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
      metadataIssues,
      issues
    )
    const outputRelativePath = buildPhotoOutputRelativePath(
      {
        capturedAt: metadata.capturedAt,
        regionName,
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
      gps: metadata.gps,
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

  private async finalizePreparedPhotos(
    preparedPhotoRecords: PreparedPhotoRecord[],
    outputRoot: string,
    issues: ScanPhotoLibraryIssue[]
  ): Promise<Photo[]> {
    const canonicalPhotoIdByHash = this.createCanonicalPhotoIdByHash(
      preparedPhotoRecords.map((record) => record.photo)
    )
    const finalizedPhotos: Photo[] = []

    for (const preparedPhotoRecord of preparedPhotoRecords) {
      const finalizedPhoto = await this.finalizePreparedPhoto(
        preparedPhotoRecord,
        outputRoot,
        canonicalPhotoIdByHash,
        issues
      )

      if (finalizedPhoto) {
        finalizedPhotos.push(finalizedPhoto)
      }
    }

    return finalizedPhotos
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
    issues: ScanPhotoLibraryIssue[]
  ): Promise<Photo | null> {
    const photo = {
      ...preparedPhotoRecord.photo
    }
    const canonicalPhotoId = photo.sha256
      ? canonicalPhotoIdByHash.get(photo.sha256)
      : undefined

    photo.isDuplicate = Boolean(canonicalPhotoId && canonicalPhotoId !== photo.id)
    photo.duplicateOfPhotoId = photo.isDuplicate ? canonicalPhotoId : undefined

    if (!photo.isDuplicate && photo.outputRelativePath) {
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
    metadataIssues: string[],
    issues: ScanPhotoLibraryIssue[]
  ): Promise<string> {
    if (!gps) {
      return this.rules.unknownRegionLabel
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
