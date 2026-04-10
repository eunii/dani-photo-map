import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { PhotoFileConflictError } from '@application/ports/PhotoLibraryFileSystemPort'
import { NodePhotoLibraryFileSystem } from '@infrastructure/filesystem/NodePhotoLibraryFileSystem'

const createdDirectories: string[] = []

async function createTempDirectory(): Promise<string> {
  const directoryPath = await mkdtemp(
    join(tmpdir(), 'photo-organizer-node-filesystem-')
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

describe('NodePhotoLibraryFileSystem', () => {
  it('lists supported photo files recursively and normalizes separators', async () => {
    const rootPath = await createTempDirectory()
    const nestedPath = join(rootPath, 'nested')
    const deeperPath = join(nestedPath, 'deeper')
    const fileSystem = new NodePhotoLibraryFileSystem()

    await mkdir(deeperPath, { recursive: true })
    await writeFile(join(rootPath, 'IMG_0002.JPG'), 'a', 'utf-8')
    await writeFile(join(deeperPath, 'IMG_0001.HEIC'), 'b', 'utf-8')
    await writeFile(join(rootPath, 'README.txt'), 'ignore', 'utf-8')

    const photoFiles = await fileSystem.listPhotoFiles(rootPath)

    expect(photoFiles).toHaveLength(2)
    expect(photoFiles[0]).toContain('/')
    expect(photoFiles[0]).toMatch(/IMG_0001\.HEIC$|IMG_0002\.JPG$/)
    expect(photoFiles[1]).toMatch(/IMG_0001\.HEIC$|IMG_0002\.JPG$/)
  })

  it('reads photo file fingerprint from size and mtime', async () => {
    const rootPath = await createTempDirectory()
    const sourcePath = join(rootPath, 'IMG_0001.JPG')
    const fileSystem = new NodePhotoLibraryFileSystem()

    await writeFile(sourcePath, 'sample-photo', 'utf-8')

    const fingerprint = await fileSystem.getPhotoFileFingerprint(sourcePath)

    expect(fingerprint).toBeTruthy()
    expect(fingerprint?.sizeBytes).toBeGreaterThan(0)
    expect(fingerprint?.modifiedAtMs).toBeGreaterThan(0)
  })

  it('copies a file and rejects destination conflicts explicitly', async () => {
    const rootPath = await createTempDirectory()
    const sourcePath = join(rootPath, 'IMG_0001.JPG')
    const destinationPath = join(rootPath, 'copy', 'IMG_0001.JPG')
    const fileSystem = new NodePhotoLibraryFileSystem()

    await writeFile(sourcePath, 'sample-photo', 'utf-8')
    await fileSystem.ensureDirectory(join(rootPath, 'copy'))
    await fileSystem.copyFile(sourcePath, destinationPath)

    await expect(readFile(destinationPath, 'utf-8')).resolves.toBe('sample-photo')
    await expect(fileSystem.copyFile(sourcePath, destinationPath)).rejects.toBeInstanceOf(
      PhotoFileConflictError
    )
  })

  it('lists direct file names and moves files safely', async () => {
    const rootPath = await createTempDirectory()
    const sourcePath = join(rootPath, 'IMG_0001.JPG')
    const destinationDirectoryPath = join(rootPath, 'renamed')
    const destinationPath = join(destinationDirectoryPath, 'IMG_0001.JPG')
    const fileSystem = new NodePhotoLibraryFileSystem()

    await writeFile(sourcePath, 'sample-photo', 'utf-8')
    await mkdir(destinationDirectoryPath, { recursive: true })

    await expect(fileSystem.listDirectoryFileNames(rootPath)).resolves.toContain(
      'IMG_0001.JPG'
    )

    await fileSystem.moveFile(sourcePath, destinationPath)

    await expect(readFile(destinationPath, 'utf-8')).resolves.toBe('sample-photo')
    await expect(fileSystem.moveFile(destinationPath, destinationPath)).resolves.toBeUndefined()
  })
})
