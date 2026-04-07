import {
  type LoadLibraryGroupDetailCommand,
  loadLibraryGroupDetailCommandSchema
} from '@application/dto/LoadLibraryGroupDetailCommand'
import type { ExistingOutputPhotoSnapshot, ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryGroupDetailResult {
  index: LibraryIndex | null
  group: PhotoGroup | null
  fallbackPhotos: ExistingOutputPhotoSnapshot[] | null
  pathSegments: string[]
}

export class LoadLibraryGroupDetailUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly existingOutputScanner: ExistingOutputScannerPort
  ) {}

  async execute(
    command: LoadLibraryGroupDetailCommand
  ): Promise<LoadLibraryGroupDetailResult> {
    const validatedCommand = loadLibraryGroupDetailCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)
    const storedIndex = await this.loadStoredLibraryIndexSafely(outputRoot)
    const storedGroup =
      storedIndex?.groups.find((group) => group.id === validatedCommand.groupId) ?? null

    if (storedIndex && storedGroup) {
      return {
        index: storedIndex,
        group: storedGroup,
        fallbackPhotos: null,
        pathSegments: validatedCommand.pathSegments ?? []
      }
    }

    const fallbackPathSegments =
      validatedCommand.pathSegments ??
      (await this.resolveFallbackPathSegments(outputRoot, validatedCommand.groupId))

    if (fallbackPathSegments.length === 0) {
      return {
        index: storedIndex,
        group: null,
        fallbackPhotos: null,
        pathSegments: []
      }
    }

    if (storedIndex) {
      const rebuiltIndex = await this.rebuildIndexFromCurrentOutput(
        outputRoot,
        storedIndex
      )
      const rebuiltGroup = findGroupByIdOrPathSegments(
        rebuiltIndex,
        validatedCommand.groupId,
        fallbackPathSegments
      )

      if (rebuiltIndex && rebuiltGroup) {
        return {
          index: rebuiltIndex,
          group: rebuiltGroup,
          fallbackPhotos: null,
          pathSegments: fallbackPathSegments
        }
      }
    }

    return {
      index: storedIndex,
      group: null,
      fallbackPhotos: await this.existingOutputScanner.scanGroupPhotos(
        outputRoot,
        fallbackPathSegments
      ),
      pathSegments: fallbackPathSegments
    }
  }

  private async resolveFallbackPathSegments(
    outputRoot: string,
    groupId: string
  ): Promise<string[]> {
    const groups = await this.existingOutputScanner.scanGroupSummaries(outputRoot)
    return groups.find((group) => group.id === groupId)?.pathSegments ?? []
  }

  private async loadStoredLibraryIndexSafely(
    outputRoot: string
  ): Promise<LibraryIndex | null> {
    try {
      return await this.libraryIndexStore.load(outputRoot)
    } catch {
      return null
    }
  }

  private async rebuildIndexFromCurrentOutput(
    outputRoot: string,
    storedIndex: LibraryIndex
  ): Promise<LibraryIndex | null> {
    const snapshot = await this.existingOutputScanner.scan(outputRoot)
    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot, storedIndex)

    if (!rebuiltIndex) {
      return null
    }

    return mergeStoredLibraryMetadata(rebuiltIndex, storedIndex)
  }
}

function findGroupByIdOrPathSegments(
  index: LibraryIndex | null,
  groupId: string,
  pathSegments: string[]
): PhotoGroup | null {
  if (!index) {
    return null
  }

  const exact = index.groups.find((group) => group.id === groupId)

  if (exact) {
    return exact
  }

  if (pathSegments.length === 0) {
    return null
  }

  const targetPath = pathSegments.join('/')

  return (
    index.groups.find((group) => {
      const groupPhotos = group.photoIds
        .map((photoId) => index.photos.find((photo) => photo.id === photoId))
        .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))
      const groupPath = groupPhotos[0]?.outputRelativePath
        ?.split('/')
        .slice(0, -1)
        .join('/')

      return groupPath === targetPath
    }) ?? null
  )
}
