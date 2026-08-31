import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { SaveHistoryEntry } from '@application/dto/SaveHistoryEntry'
import { JsonSaveHistoryStore } from '@infrastructure/storage/JsonSaveHistoryStore'

const createdDirectories: string[] = []

async function createTempDirectory(): Promise<string> {
  const directoryPath = await mkdtemp(join(tmpdir(), 'photo-organizer-save-history-'))

  createdDirectories.push(directoryPath)

  return directoryPath
}

function createEntry(overrides: Partial<SaveHistoryEntry> = {}): SaveHistoryEntry {
  return {
    jobId: 'organize-1',
    startedAtIso: '2026-04-03T10:00:00.000Z',
    completedAtIso: '2026-04-03T10:05:00.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    phase: 'completed',
    copiedCount: 10,
    duplicateCount: 1,
    skippedExistingCount: 0,
    warningCount: 0,
    failureCount: 0,
    ...overrides
  }
}

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe('JsonSaveHistoryStore', () => {
  it('returns an empty array when no history file exists yet', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonSaveHistoryStore()

    expect(await store.load(outputRoot)).toEqual([])
  })

  it('appends newest entries first and persists them to disk', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonSaveHistoryStore()

    await store.append(outputRoot, createEntry({ jobId: 'organize-1' }))
    await store.append(outputRoot, createEntry({ jobId: 'organize-2' }))

    const loaded = await store.load(outputRoot)

    expect(loaded.map((entry) => entry.jobId)).toEqual(['organize-2', 'organize-1'])

    const raw = await readFile(
      join(outputRoot, '.photo-organizer/save-history.json'),
      'utf-8'
    )
    expect(JSON.parse(raw)).toHaveLength(2)
  })

  it('caps the stored history at 200 entries', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonSaveHistoryStore()

    for (let i = 0; i < 205; i += 1) {
      await store.append(outputRoot, createEntry({ jobId: `organize-${i}` }))
    }

    const loaded = await store.load(outputRoot)

    expect(loaded).toHaveLength(200)
    // Most recent append should still be first.
    expect(loaded[0]?.jobId).toBe('organize-204')
  })

  it('treats a corrupted history file as empty instead of throwing', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonSaveHistoryStore()

    await store.append(outputRoot, createEntry())
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      join(outputRoot, '.photo-organizer/save-history.json'),
      'not valid json',
      'utf-8'
    )

    await expect(store.load(outputRoot)).resolves.toEqual([])
  })
})
