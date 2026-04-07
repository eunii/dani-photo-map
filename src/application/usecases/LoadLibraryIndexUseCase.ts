import {
  type LoadLibraryIndexCommand,
  loadLibraryIndexCommandSchema
} from '@application/dto/LoadLibraryIndexCommand'
import type { ExistingOutputGroupSummarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryIndexResult {
  index: LibraryIndex | null
  fallbackGroups: ExistingOutputGroupSummarySnapshot[] | null
  source: 'merged' | 'fallback' | 'folder-structure' | null
}

export class LoadLibraryIndexUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly existingOutputScanner: ExistingOutputScannerPort
  ) {}

  async execute(
    command: LoadLibraryIndexCommand
  ): Promise<LoadLibraryIndexResult> {
    const validatedCommand = loadLibraryIndexCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)

    if (validatedCommand.mode === 'folder-structure-only') {
      return this.loadFolderStructureOnly(outputRoot)
    }

    const storedIndex = await this.loadStoredLibraryIndexSafely(outputRoot)

    if (storedIndex) {
      return {
        index: storedIndex,
        fallbackGroups: null,
        source: 'merged'
      }
    }

    const fallbackGroups =
      await this.existingOutputScanner.scanGroupSummaries(outputRoot)

    if (fallbackGroups.length === 0) {
      return {
        index: null,
        fallbackGroups: null,
        source: null
      }
    }

    return {
      index: null,
      fallbackGroups,
      source: 'fallback'
    }
  }

  private async loadFolderStructureOnly(
    outputRoot: string
  ): Promise<LoadLibraryIndexResult> {
    const storedIndex = await this.loadStoredLibraryIndexSafely(outputRoot)
    const snapshot = await this.existingOutputScanner.scan(outputRoot)

    if (snapshot.photos.length === 0) {
      return {
        index: null,
        fallbackGroups: null,
        source: null
      }
    }

    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot, storedIndex)

    if (!rebuiltIndex) {
      return {
        index: null,
        fallbackGroups: null,
        source: null
      }
    }

    return {
      index: mergeStoredLibraryMetadata(rebuiltIndex, storedIndex),
      fallbackGroups: null,
      source: 'folder-structure'
    }
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
