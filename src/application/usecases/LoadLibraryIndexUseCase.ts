import {
  type LoadLibraryIndexCommand,
  loadLibraryIndexCommandSchema
} from '@application/dto/LoadLibraryIndexCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export interface LoadLibraryIndexResult {
  index: LibraryIndex | null
  source: 'index' | 'fallback' | null
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

    try {
      const index = await this.libraryIndexStore.load(outputRoot)

      if (index) {
        return {
          index,
          source: 'index'
        }
      }
    } catch {
      // Invalid or unreadable index.json should fall back to output scan.
    }

    const snapshot = await this.existingOutputScanner.scan(outputRoot)
    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot)

    return {
      index: rebuiltIndex,
      source: rebuiltIndex ? 'fallback' : null
    }
  }
}
