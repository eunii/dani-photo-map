import type { LibraryIndex } from '@domain/entities/LibraryIndex'

export interface LibraryIndexStorePort {
  load(outputRoot: string): Promise<LibraryIndex | null>
  save(index: LibraryIndex): Promise<void>
}
