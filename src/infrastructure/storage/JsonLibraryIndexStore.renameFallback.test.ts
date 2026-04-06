import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'

const { renameMock } = vi.hoisted(() => ({
  renameMock: vi.fn()
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()

  return {
    ...actual,
    rename: (...args: Parameters<typeof actual.rename>) => {
      if (renameMock.getMockImplementation()) {
        return renameMock(...args)
      }

      return actual.rename(...args)
    }
  }
})

const { JsonLibraryIndexStore } = await import('@infrastructure/storage/JsonLibraryIndexStore')

const createdDirectories: string[] = []

async function createTempDirectory(): Promise<string> {
  const directoryPath = await mkdtemp(
    join(tmpdir(), 'photo-organizer-index-store-rename-fallback-')
  )

  createdDirectories.push(directoryPath)

  return directoryPath
}

function createLibraryIndex(outputRoot: string): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot,
    photos: [],
    groups: []
  }
}

beforeEach(() => {
  renameMock.mockReset()
})

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directoryPath) => rm(directoryPath, { recursive: true, force: true }))
  )
})

describe('JsonLibraryIndexStore rename fallback', () => {
  it('writes index.json directly when temp rename fails with ENOENT', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonLibraryIndexStore()
    const expectedIndex = createLibraryIndex(outputRoot)
    const missingPathError = Object.assign(new Error('missing path'), {
      code: 'ENOENT'
    })

    renameMock.mockRejectedValueOnce(missingPathError)

    await expect(store.save(expectedIndex)).resolves.toBeUndefined()

    const savedFile = await readFile(
      join(outputRoot, '.photo-organizer', 'index.json'),
      'utf-8'
    )

    expect(savedFile).toContain('"version"')
    await expect(store.load(outputRoot)).resolves.toEqual(expectedIndex)
  })
})
