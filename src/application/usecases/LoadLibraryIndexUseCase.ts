import {
  type LoadLibraryIndexCommand,
  loadLibraryIndexCommandSchema
} from '@application/dto/LoadLibraryIndexCommand'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export class LoadLibraryIndexUseCase {
  constructor(private readonly libraryIndexStore: LibraryIndexStorePort) {}

  async execute(command: LoadLibraryIndexCommand): Promise<LibraryIndex | null> {
    const validatedCommand = loadLibraryIndexCommandSchema.parse(command)

    return this.libraryIndexStore.load(
      normalizePathSeparators(validatedCommand.outputRoot)
    )
  }
}
