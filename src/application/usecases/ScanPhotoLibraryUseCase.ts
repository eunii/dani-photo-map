import {
  type ScanPhotoLibraryCommand,
  scanPhotoLibraryCommandSchema
} from '@application/dto/ScanPhotoLibraryCommand'
import type { ScanPhotoLibraryResult } from '@application/dto/ScanPhotoLibraryResult'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
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

export class ScanPhotoLibraryUseCase {
  private readonly rules: OrganizationRules

  constructor(private readonly dependencies: ScanPhotoLibraryDependencies) {
    this.rules = dependencies.rules ?? defaultOrganizationRules
  }

  async execute(command: ScanPhotoLibraryCommand): Promise<ScanPhotoLibraryResult> {
    const validatedCommand = scanPhotoLibraryCommandSchema.parse(command)
    const sourceRoot = normalizePathSeparators(validatedCommand.sourceRoot)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)

    const photoPaths = await this.dependencies.fileSystem.listPhotoFiles(
      sourceRoot
    )
    const seenHashes = new Set<string>()
    const photos: Photo[] = []

    await this.dependencies.fileSystem.ensureDirectory(outputRoot)
    await this.dependencies.fileSystem.ensureDirectory(
      joinPathSegments(outputRoot, this.rules.outputThumbnailsRelativePath)
    )

    for (const [index, listedPhotoPath] of photoPaths.entries()) {
      const sourcePath = normalizePathSeparators(listedPhotoPath)
      const metadataIssues: string[] = []
      const metadata = await this.readMetadataSafely(sourcePath, metadataIssues)
      const sha256 = await this.dependencies.hasher.createSha256(sourcePath)
      const isDuplicate = seenHashes.has(sha256)

      if (!isDuplicate) {
        seenHashes.add(sha256)
      }

      const regionName = await this.resolveRegionNameSafely(
        metadata.gps,
        metadataIssues
      )
      const photo: Photo = {
        id: `photo-${index + 1}`,
        sourcePath,
        sourceFileName: getPathBaseName(sourcePath),
        sha256,
        capturedAt: metadata.capturedAt,
        gps: metadata.gps,
        regionName,
        outputRelativePath: buildPhotoOutputRelativePath(
          {
            capturedAt: metadata.capturedAt,
            regionName,
            sourceFileName: getPathBaseName(sourcePath)
          },
          this.rules
        ),
        isDuplicate,
        metadataIssues
      }

      if (!photo.isDuplicate && photo.outputRelativePath) {
        await this.copyPhotoToOutput(outputRoot, photo)
        photo.thumbnailRelativePath = await this.generateThumbnailSafely(
          sourcePath,
          metadataIssues
        )
      }

      photos.push(photo)
    }

    const groups = createPhotoGroups(photos)
    const index: LibraryIndex = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: new Date().toISOString(),
      sourceRoot,
      outputRoot,
      photos,
      groups
    }

    await this.dependencies.libraryIndexStore.save(index)

    return {
      scannedCount: photos.length,
      duplicateCount: photos.filter((photo) => photo.isDuplicate).length,
      keptCount: photos.filter((photo) => !photo.isDuplicate).length,
      groupCount: groups.length,
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

  private async readMetadataSafely(
    sourcePath: string,
    metadataIssues: string[]
  ) {
    try {
      return await this.dependencies.metadataReader.read(sourcePath)
    } catch {
      metadataIssues.push('metadata-read-failed')
      return {}
    }
  }

  private async resolveRegionNameSafely(
    gps: PhotoMetadata['gps'],
    metadataIssues: string[]
  ): Promise<string> {
    if (!gps) {
      return this.rules.unknownRegionLabel
    }

    try {
      return await this.dependencies.regionResolver.resolveName(gps)
    } catch {
      metadataIssues.push('region-resolve-failed')
      return this.rules.unknownRegionLabel
    }
  }

  private async copyPhotoToOutput(
    outputRoot: string,
    photo: Pick<Photo, 'sourcePath' | 'outputRelativePath'>
  ): Promise<void> {
    if (!photo.outputRelativePath) {
      return
    }

    const destinationPath = joinPathSegments(outputRoot, photo.outputRelativePath)
    const destinationDirectory = getPathDirectoryName(destinationPath)

    await this.dependencies.fileSystem.ensureDirectory(destinationDirectory)
    await this.dependencies.fileSystem.copyFile(photo.sourcePath, destinationPath)
  }

  private async generateThumbnailSafely(
    sourcePath: string,
    metadataIssues: string[]
  ): Promise<string | undefined> {
    try {
      return await this.dependencies.thumbnailGenerator.generateForPhoto(sourcePath)
    } catch {
      metadataIssues.push('thumbnail-generation-failed')
      return undefined
    }
  }
}
