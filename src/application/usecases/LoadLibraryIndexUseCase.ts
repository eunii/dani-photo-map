import {
  type LoadLibraryIndexCommand,
  loadLibraryIndexCommandSchema
} from '@application/dto/LoadLibraryIndexCommand'
import type { ExistingOutputGroupSummarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryIndexResult {
  index: LibraryIndex | null
  fallbackGroups: ExistingOutputGroupSummarySnapshot[] | null
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
