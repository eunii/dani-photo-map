import {
  type LoadLibraryGroupDetailCommand,
  loadLibraryGroupDetailCommandSchema
} from '@application/dto/LoadLibraryGroupDetailCommand'
import type { ExistingOutputPhotoSnapshot, ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryGroupDetailResult {
  storedIndex: LibraryIndex | null
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
        storedIndex,
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
        storedIndex,
        group: null,
        fallbackPhotos: null,
        pathSegments: []
      }
    }

    return {
      storedIndex,
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
}
