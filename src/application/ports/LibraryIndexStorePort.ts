import type { LibraryIndex } from '@domain/entities/LibraryIndex'

export interface LibraryIndexStorePort {
  save(index: LibraryIndex): Promise<void>
}
