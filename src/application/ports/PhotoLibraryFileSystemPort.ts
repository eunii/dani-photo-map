export class PhotoFileConflictError extends Error {
  constructor(
    public readonly destinationPath: string,
    message = `Destination file already exists: ${destinationPath}`
  ) {
    super(message)
    this.name = 'PhotoFileConflictError'
  }
}

export interface PhotoFileFingerprint {
  sizeBytes: number
  modifiedAtMs: number
}

export interface PhotoLibraryFileSystemPort {
  listPhotoFiles(rootPath: string): Promise<string[]>
  getPhotoFileFingerprint?(absolutePath: string): Promise<PhotoFileFingerprint | null>
  listDirectoryFileNames(directoryPath: string): Promise<string[]>
  ensureDirectory(path: string): Promise<void>
  copyFile(sourcePath: string, destinationPath: string): Promise<void>
  moveFile(sourcePath: string, destinationPath: string): Promise<void>
  /** 파일이 없어도 무시합니다. */
  removeFileIfExists(absolutePath: string): Promise<void>
  /** 디렉터리와 하위를 모두 삭제합니다. 없으면 무시합니다. */
  removeDirectoryRecursiveIfExists(absolutePath: string): Promise<void>
}
