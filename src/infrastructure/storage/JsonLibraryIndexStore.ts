import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { parseLibraryIndexDocument } from '@shared/types/libraryIndex'

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

function isWindowsRenameConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'EEXIST' || error.code === 'EPERM')
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export class JsonLibraryIndexStore implements LibraryIndexStorePort {
  constructor(
    private readonly indexRelativePath = '.photo-organizer/index.json'
  ) {}

  async load(outputRoot: string): Promise<LibraryIndex | null> {
    const filePath = this.getFilePath(outputRoot)

    try {
      const raw = await readFile(filePath, 'utf-8')

      return parseLibraryIndexDocument(JSON.parse(raw))
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return null
      }

      throw new Error(
        `Failed to load library index at ${filePath}: ${getErrorMessage(error)}`
      )
    }
  }

  async save(index: LibraryIndex): Promise<void> {
    const validatedIndex = parseLibraryIndexDocument(index)
    const filePath = this.getFilePath(index.outputRoot)
    const tempFilePath = `${filePath}.${Date.now()}.${process.pid}.tmp`

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(
      tempFilePath,
      `${JSON.stringify(validatedIndex, null, 2)}\n`,
      'utf-8'
    )

    try {
      await rename(tempFilePath, filePath)
    } catch (error) {
      if (!isWindowsRenameConflictError(error)) {
        await rm(tempFilePath, { force: true })
        throw new Error(
          `Failed to save library index at ${filePath}: ${getErrorMessage(error)}`
        )
      }

      await rm(filePath, { force: true })

      try {
        await rename(tempFilePath, filePath)
      } catch (renameError) {
        await rm(tempFilePath, { force: true })
        throw new Error(
          `Failed to save library index at ${filePath}: ${getErrorMessage(renameError)}`
        )
      }
    }
  }

  private getFilePath(outputRoot: string): string {
    return join(outputRoot, this.indexRelativePath)
  }
}
