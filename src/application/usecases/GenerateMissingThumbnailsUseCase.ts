import {
  type GenerateMissingThumbnailsCommand,
  generateMissingThumbnailsCommandSchema
} from '@application/dto/GenerateMissingThumbnailsCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'
import { loadLibraryIndexForMutations } from '@application/services/loadLibraryIndexForMutations'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import { isVideoLibraryFileName } from '@shared/constants/mediaExtensions'
import { matchesOutputPath } from '@shared/utils/outputRelativePath'
import { joinPathSegments, normalizePathSeparators } from '@shared/utils/path'
import { mapWithConcurrencyLimit } from '@shared/utils/mapWithConcurrencyLimit'

const THUMBNAIL_GENERATION_CONCURRENCY = 2

export interface GenerateMissingThumbnailsResult {
  index: LibraryIndex
  attemptedCount: number
  succeededCount: number
  failedCount: number
}

function matchesRequestedPath(photo: Photo, pathSegments: string[]): boolean {
  return matchesOutputPath(photo.outputRelativePath, pathSegments)
}

export class GenerateMissingThumbnailsUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly thumbnailGenerator: ThumbnailGeneratorPort,
    private readonly existingOutputScanner?: ExistingOutputScannerPort
  ) {}

  async execute(
    command: GenerateMissingThumbnailsCommand
  ): Promise<GenerateMissingThumbnailsResult> {
    const validated = generateMissingThumbnailsCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validated.outputRoot)
    const pathSegments = validated.pathSegments

    const index = await loadLibraryIndexForMutations({
      outputRoot,
      libraryIndexStore: this.libraryIndexStore,
      existingOutputScanner: this.existingOutputScanner
    })

    const targetPhotos = index.photos.filter(
      (photo) =>
        !photo.thumbnailRelativePath &&
        Boolean(photo.outputRelativePath) &&
        !isVideoLibraryFileName(photo.sourceFileName) &&
        matchesRequestedPath(photo, pathSegments)
    )

    let succeededCount = 0
    let failedCount = 0

    try {
      await mapWithConcurrencyLimit(
        targetPhotos,
        THUMBNAIL_GENERATION_CONCURRENCY,
        async (photo) => {
          try {
            const photoAbsolutePath = joinPathSegments(
              outputRoot,
              photo.outputRelativePath!
            )
            const thumbnailFileName =
              await this.thumbnailGenerator.generateForPhoto(photoAbsolutePath)

            photo.thumbnailRelativePath = joinPathSegments(
              defaultOrganizationRules.outputThumbnailsRelativePath,
              thumbnailFileName
            )

            for (const group of index.groups) {
              if (group.representativePhotoId === photo.id) {
                group.representativeThumbnailRelativePath =
                  photo.thumbnailRelativePath
              }
            }

            succeededCount += 1
          } catch {
            failedCount += 1
          }
        }
      )
    } finally {
      await this.thumbnailGenerator.dispose?.()
    }

    if (succeededCount > 0) {
      await this.libraryIndexStore.save(index)
    }

    return {
      index,
      attemptedCount: targetPhotos.length,
      succeededCount,
      failedCount
    }
  }
}
