import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'

export class JsonLibraryIndexStore implements LibraryIndexStorePort {
  constructor(
    private readonly indexRelativePath = '.photo-organizer/index.json'
  ) {}

  async save(index: LibraryIndex): Promise<void> {
    const filePath = join(index.outputRoot, this.indexRelativePath)

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8')
  }
}
