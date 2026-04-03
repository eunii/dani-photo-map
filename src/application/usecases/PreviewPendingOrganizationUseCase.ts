import {
  type PreviewPendingOrganizationCommand,
  previewPendingOrganizationCommandSchema
} from '@application/dto/PreviewPendingOrganizationCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import type {
  PhotoMetadata,
  PhotoMetadataReaderPort
} from '@application/ports/PhotoMetadataReaderPort'
import type { PhotoPreviewPort } from '@application/ports/PhotoPreviewPort'
import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import { buildNearbyGroupTitleSuggestions } from '@application/services/buildNearbyGroupTitleSuggestions'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
import { selectCanonicalDuplicatePhoto } from '@domain/services/DuplicatePhotoPolicy'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import {
  getPathBaseName,
  normalizePathSeparators
} from '@shared/utils/path'

export interface PendingOrganizationPreviewGroupPhoto {
  id: string
  sourcePath: string
  sourceFileName: string
  capturedAtIso?: string
  hasGps: boolean
  previewDataUrl?: string
}

export interface PendingOrganizationPreviewGroup {
  groupKey: string
  displayTitle: string
  suggestedTitles: string[]
  photoCount: number
  representativeGps?: {
    latitude: number
    longitude: number
  }
  representativePhotos: PendingOrganizationPreviewGroupPhoto[]
}

export interface PreviewPendingOrganizationResult {
  scannedCount: number
  pendingPhotoCount: number
  skippedExistingCount: number
  groups: PendingOrganizationPreviewGroup[]
}

export interface PreviewPendingOrganizationDependencies {
  fileSystem: PhotoLibraryFileSystemPort
  metadataReader: PhotoMetadataReaderPort
  hasher: PhotoHasherPort
  regionResolver: RegionResolverPort
  photoPreview: PhotoPreviewPort
  libraryIndexStore: LibraryIndexStorePort
  existingOutputScanner: ExistingOutputScannerPort
  rules?: OrganizationRules
}

interface PreviewPhotoContext {
  photoId: string
  sourcePath: string
  sourceFileName: string
}

export class PreviewPendingOrganizationUseCase {
  private readonly rules: OrganizationRules

  constructor(
    private readonly dependencies: PreviewPendingOrganizationDependencies
  ) {
    this.rules = dependencies.rules ?? defaultOrganizationRules
  }

  async execute(
    command: PreviewPendingOrganizationCommand
  ): Promise<PreviewPendingOrganizationResult> {
    const validatedCommand = previewPendingOrganizationCommandSchema.parse(command)
    const sourceRoot = normalizePathSeparators(validatedCommand.sourceRoot)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)
    const existingOutputSnapshot = await this.dependencies.existingOutputScanner.scan(
      outputRoot
    )
    const existingOutputHashes = await this.createExistingOutputHashes(
      existingOutputSnapshot
    )
    const existingIndex = await this.loadExistingIndex(outputRoot, existingOutputSnapshot)
    const listedPhotoPaths = await this.dependencies.fileSystem.listPhotoFiles(sourceRoot)
    const candidatePhotos: Photo[] = []
    const canonicalCandidates: Photo[] = []
    let skippedExistingCount = 0

    for (const [index, listedPhotoPath] of listedPhotoPaths.entries()) {
      const sourcePath = normalizePathSeparators(listedPhotoPath)
      const candidatePhoto = await this.prepareCandidatePhoto(
        {
          photoId: `preview-photo-${index + 1}`,
          sourcePath,
          sourceFileName: getPathBaseName(sourcePath)
        }
      )

      if (candidatePhoto) {
        candidatePhotos.push(candidatePhoto)
      }
    }

    const canonicalPhotoIdByHash = this.createCanonicalPhotoIdByHash(candidatePhotos)

    for (const candidatePhoto of candidatePhotos) {
      const canonicalPhotoId = candidatePhoto.sha256
        ? canonicalPhotoIdByHash.get(candidatePhoto.sha256)
        : undefined
      const isDuplicateWithinPreview = Boolean(
        canonicalPhotoId && canonicalPhotoId !== candidatePhoto.id
      )

      if (isDuplicateWithinPreview) {
        continue
      }

      if (candidatePhoto.sha256 && existingOutputHashes.has(candidatePhoto.sha256)) {
        skippedExistingCount += 1
        continue
      }

      canonicalCandidates.push(candidatePhoto)
    }

    const previewGroups = createPhotoGroups(canonicalCandidates)
    const photosById = new Map(canonicalCandidates.map((photo) => [photo.id, photo]))

    const groups = await Promise.all(
      previewGroups.map(async (group) => ({
        groupKey: group.groupKey,
        displayTitle: group.displayTitle,
        suggestedTitles: buildNearbyGroupTitleSuggestions(group, existingIndex?.groups ?? []),
        photoCount: group.photoIds.length,
        representativeGps: group.representativeGps,
        representativePhotos: await Promise.all(
          group.photoIds
            .map((photoId) => photosById.get(photoId))
            .filter((photo): photo is Photo => photo !== undefined)
            .slice(0, 3)
            .map(async (photo) => ({
              id: photo.id,
              sourcePath: photo.sourcePath,
              sourceFileName: photo.sourceFileName,
              capturedAtIso: photo.capturedAt?.iso,
              hasGps: Boolean(photo.gps),
              previewDataUrl: await this.createPreviewDataUrlSafely(photo.sourcePath)
            }))
        )
      }))
    )

    return {
      scannedCount: listedPhotoPaths.length,
      pendingPhotoCount: canonicalCandidates.length,
      skippedExistingCount,
      groups
    }
  }

  private async prepareCandidatePhoto(
    context: PreviewPhotoContext
  ): Promise<Photo | null> {
    const metadata = await this.readMetadataSafely(context.sourcePath)
    const sha256 = await this.createSha256Safely(context.sourcePath)

    if (!sha256) {
      return null
    }

    const regionName = await this.resolveRegionNameSafely(metadata.gps)

    return {
      id: context.photoId,
      sourcePath: context.sourcePath,
      sourceFileName: context.sourceFileName,
      sha256,
      capturedAt: metadata.capturedAt,
      capturedAtSource: metadata.capturedAtSource,
      gps: metadata.gps,
      regionName,
      isDuplicate: false,
      metadataIssues: metadata.metadataIssues ?? []
    }
  }

  private async readMetadataSafely(sourcePath: string): Promise<PhotoMetadata> {
    try {
      return await this.dependencies.metadataReader.read(sourcePath)
    } catch {
      return {
        metadataIssues: ['metadata-read-failed']
      }
    }
  }

  private async createSha256Safely(sourcePath: string): Promise<string | null> {
    try {
      return await this.dependencies.hasher.createSha256(sourcePath)
    } catch {
      return null
    }
  }

  private async resolveRegionNameSafely(
    gps: PhotoMetadata['gps']
  ): Promise<string> {
    if (!gps) {
      return this.rules.unknownRegionLabel
    }

    try {
      return await this.dependencies.regionResolver.resolveName(gps)
    } catch {
      return this.rules.unknownRegionLabel
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

  private async createExistingOutputHashes(snapshot: {
    photos: Array<{ sourcePath: string }>
  }): Promise<Set<string>> {
    const hashes = new Set<string>()

    for (const photo of snapshot.photos) {
      try {
        hashes.add(await this.dependencies.hasher.createSha256(photo.sourcePath))
      } catch {
        // Ignore preview hash failures for existing output files.
      }
    }

    return hashes
  }

  private async createPreviewDataUrlSafely(
    sourcePath: string
  ): Promise<string | undefined> {
    try {
      return await this.dependencies.photoPreview.createDataUrl(sourcePath)
    } catch {
      return undefined
    }
  }

  private async loadExistingIndex(
    outputRoot: string,
    existingOutputSnapshot: Parameters<
      typeof rebuildLibraryIndexFromExistingOutput
    >[0]
  ): Promise<LibraryIndex | null> {
    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(
      existingOutputSnapshot
    )

    if (!rebuiltIndex) {
      return null
    }

    try {
      const storedIndex = await this.dependencies.libraryIndexStore.load(outputRoot)

      return mergeStoredLibraryMetadata(rebuiltIndex, storedIndex)
    } catch {
      return rebuiltIndex
    }
  }
}
