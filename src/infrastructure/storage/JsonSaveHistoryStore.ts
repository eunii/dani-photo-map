import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { SaveHistoryEntry } from '@application/dto/SaveHistoryEntry'
import type { SaveHistoryStorePort } from '@application/ports/SaveHistoryStorePort'

const MAX_HISTORY_ENTRIES = 200

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isWindowsRenameConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'EEXIST' || error.code === 'EPERM')
  )
}

export class JsonSaveHistoryStore implements SaveHistoryStorePort {
  constructor(
    private readonly historyRelativePath = '.photo-organizer/save-history.json'
  ) {}

  async load(outputRoot: string): Promise<SaveHistoryEntry[]> {
    const filePath = this.getFilePath(outputRoot)

    try {
      const raw = await readFile(filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)

      return Array.isArray(parsed) ? (parsed as SaveHistoryEntry[]) : []
    } catch {
      // 이력은 부가 정보라, 파일이 없거나 손상됐다고 앱 동작을 막지 않는다.
      return []
    }
  }

  async append(outputRoot: string, entry: SaveHistoryEntry): Promise<void> {
    const existing = await this.load(outputRoot)
    const next = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES)

    await this.write(outputRoot, next)
  }

  private async write(outputRoot: string, entries: SaveHistoryEntry[]): Promise<void> {
    const filePath = this.getFilePath(outputRoot)
    const tempFilePath = `${filePath}.${Date.now()}.${process.pid}.tmp`
    const serialized = `${JSON.stringify(entries, null, 2)}\n`

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(tempFilePath, serialized, 'utf-8')

    try {
      await rename(tempFilePath, filePath)
    } catch (error) {
      if (!isWindowsRenameConflictError(error) && !isFileNotFoundError(error)) {
        await rm(tempFilePath, { force: true })
        return
      }

      try {
        await rm(filePath, { force: true })
        await rename(tempFilePath, filePath)
      } catch {
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, serialized, 'utf-8')
        await rm(tempFilePath, { force: true })
      }
    }
  }

  private getFilePath(outputRoot: string): string {
    return join(outputRoot, this.historyRelativePath)
  }
}
