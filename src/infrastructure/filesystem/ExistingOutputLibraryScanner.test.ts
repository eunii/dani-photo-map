import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ExistingOutputLibraryScanner } from '@infrastructure/filesystem/ExistingOutputLibraryScanner'

const createdDirectories: string[] = []

async function createTempDirectory(): Promise<string> {
  const directoryPath = await mkdtemp(
    join(tmpdir(), 'photo-organizer-existing-output-')
  )

  createdDirectories.push(directoryPath)

  return directoryPath
}

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directoryPath) => rm(directoryPath, { recursive: true, force: true }))
  )
})

describe('ExistingOutputLibraryScanner', () => {
  it('scans organized output files and skips .photo-organizer artifacts', async () => {
    const outputRoot = await createTempDirectory()
    const scanner = new ExistingOutputLibraryScanner()

    await mkdir(join(outputRoot, '2026', '04', 'seoul'), { recursive: true })
    await mkdir(join(outputRoot, '.photo-organizer', 'thumbnails'), {
      recursive: true
    })
    await writeFile(
      join(outputRoot, '2026', '04', 'seoul', '2026-04-03_080000_IMG_0001.JPG'),
      'photo-1',
      'utf-8'
    )
    await writeFile(
      join(outputRoot, '2026', '04', 'seoul', 'README.txt'),
      'ignore',
      'utf-8'
    )
    await writeFile(
      join(
        outputRoot,
        '.photo-organizer',
        'thumbnails',
        'unused-thumbnail.webp'
      ),
      'thumb',
      'utf-8'
    )

    const snapshot = await scanner.scan(outputRoot)

    expect(snapshot.photos).toHaveLength(1)
    expect(snapshot.photos[0]).toMatchObject({
      sourceFileName: '2026-04-03_080000_IMG_0001.JPG',
      regionName: 'seoul',
      folderGroupingLabel: 'seoul',
      outputRelativePath: '2026/04/seoul/2026-04-03_080000_IMG_0001.JPG',
      capturedAt: {
        year: '2026',
        month: '04',
        day: '03',
        time: '080000'
      }
    })
  })

  it('extracts custom folder labels from organized output paths', async () => {
    const outputRoot = await createTempDirectory()
    const scanner = new ExistingOutputLibraryScanner()

    await mkdir(join(outputRoot, '2026', '04', '요세미티_국립공원그룹'), {
      recursive: true
    })
    await writeFile(
      join(
        outputRoot,
        '2026',
        '04',
        '요세미티_국립공원그룹',
        '2026-04-03_080000_IMG_0001.JPG'
      ),
      'photo-1',
      'utf-8'
    )

    const snapshot = await scanner.scan(outputRoot)

    expect(snapshot.photos[0]).toMatchObject({
      regionName: '요세미티_국립공원그룹',
      folderGroupingLabel: '요세미티_국립공원그룹'
    })
  })
})
