import {
  type LoadLibraryIndexCommand,
  loadLibraryIndexCommandSchema
} from '@application/dto/LoadLibraryIndexCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryIndexResult {
  index: LibraryIndex | null
  source: 'merged' | 'fallback' | null
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
    const storedIndex = await this.loadStoredLibraryIndexSafely(outputRoot)
    const snapshot = await this.existingOutputScanner.scan(outputRoot)
    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot)

    if (!rebuiltIndex) {
      return {
        index: null,
        source: null
      }
    }

    const mergedIndex = mergeStoredLibraryMetadata(rebuiltIndex, storedIndex)

    if (storedIndex) {
      const toPersist: LibraryIndex = {
        ...mergedIndex,
        generatedAt: new Date().toISOString()
      }
      await this.libraryIndexStore.save(toPersist)
      return {
        index: toPersist,
        source: 'merged'
      }
    }

    return {
      index: mergedIndex,
      source: 'fallback'
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
