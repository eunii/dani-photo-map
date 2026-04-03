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
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import { joinPathSegments } from '@shared/utils/path'

function getFileNameFromPath(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

function getDirectoryName(path: string): string {
  const segments = path.split('/')

  segments.pop()

  return segments.join('/')
}

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
    scanPhotoLibraryCommandSchema.parse(command)

    const photoPaths = await this.dependencies.fileSystem.listPhotoFiles(
      command.sourceRoot
    )
    const seenHashes = new Set<string>()
    const photos: Photo[] = []

    await this.dependencies.fileSystem.ensureDirectory(command.outputRoot)
    await this.dependencies.fileSystem.ensureDirectory(
      joinPathSegments(command.outputRoot, this.rules.outputThumbnailsRelativePath)
    )

    for (const [index, sourcePath] of photoPaths.entries()) {
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
        sourceFileName: getFileNameFromPath(sourcePath),
        sha256,
        capturedAt: metadata.capturedAt,
        gps: metadata.gps,
        regionName,
        outputRelativePath: buildPhotoOutputRelativePath(
          {
            capturedAt: metadata.capturedAt,
            regionName,
            sourceFileName: getFileNameFromPath(sourcePath)
          },
          this.rules
        ),
        isDuplicate,
        metadataIssues
      }

      if (!photo.isDuplicate && photo.outputRelativePath) {
        await this.copyPhotoToOutput(command.outputRoot, photo)
        photo.thumbnailRelativePath = await this.generateThumbnailSafely(
          sourcePath,
          metadataIssues
        )
      }

      photos.push(photo)
    }

    const groups = createPhotoGroups(photos)
    const index: LibraryIndex = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceRoot: command.sourceRoot,
      outputRoot: command.outputRoot,
      photos,
      groups
    }

    await this.dependencies.libraryIndexStore.save(index)

    return {
      scannedCount: photos.length,
      duplicateCount: photos.filter((photo) => photo.isDuplicate).length,
      keptCount: photos.filter((photo) => !photo.isDuplicate).length,
      groupCount: groups.length
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
    const destinationDirectory = getDirectoryName(destinationPath)

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
