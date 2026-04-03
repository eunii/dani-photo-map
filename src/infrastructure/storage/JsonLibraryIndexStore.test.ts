import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import { JsonLibraryIndexStore } from '@infrastructure/storage/JsonLibraryIndexStore'

const createdDirectories: string[] = []

async function createTempDirectory(): Promise<string> {
  const directoryPath = await mkdtemp(join(tmpdir(), 'photo-organizer-index-store-'))

  createdDirectories.push(directoryPath)

  return directoryPath
}

function createLibraryIndex(outputRoot: string): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot,
    photos: [
      {
        id: 'photo-1',
        sourcePath: 'C:/photos/source/IMG_0001.JPG',
        sourceFileName: 'IMG_0001.JPG',
        sha256: 'abc123',
        capturedAt: {
          iso: '2026-04-03T10:11:12.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '101112'
        },
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        regionName: 'seoul',
        outputRelativePath: '2026/04/seoul/2026-04-03_101112_IMG_0001.JPG',
        thumbnailRelativePath: 'thumb-1.webp',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        title: '2026년 4월 서울',
        displayTitle: '2026년 4월 서울',
        photoIds: ['photo-1'],
        representativePhotoId: 'photo-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        representativeThumbnailRelativePath: 'thumb-1.webp',
        companions: ['Alice'],
        notes: 'sample note'
      }
    ]
  }
}

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directoryPath) =>
        rm(directoryPath, { recursive: true, force: true })
      )
  )
})

describe('JsonLibraryIndexStore', () => {
  it('saves and loads a validated library index', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonLibraryIndexStore()
    const expectedIndex = createLibraryIndex(outputRoot)

    await store.save(expectedIndex)

    await expect(store.load(outputRoot)).resolves.toEqual(expectedIndex)
  })

  it('returns null when the index file does not exist', async () => {
    const outputRoot = await createTempDirectory()
    const store = new JsonLibraryIndexStore()

    await expect(store.load(outputRoot)).resolves.toBeNull()
  })

  it('rejects unsupported index versions on load', async () => {
    const outputRoot = await createTempDirectory()
    const indexPath = join(outputRoot, '.photo-organizer', 'index.json')
    const store = new JsonLibraryIndexStore()

    await mkdir(join(outputRoot, '.photo-organizer'), { recursive: true })
    await writeFile(
      indexPath,
      JSON.stringify({
        version: 999,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot,
        photos: [],
        groups: []
      }),
      'utf-8'
    )

    await expect(store.load(outputRoot)).rejects.toThrow(
      'Unsupported library index version: 999'
    )
  })
})
