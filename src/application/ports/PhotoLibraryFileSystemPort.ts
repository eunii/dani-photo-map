export class PhotoFileConflictError extends Error {
  constructor(
    public readonly destinationPath: string,
    message = `Destination file already exists: ${destinationPath}`
  ) {
    super(message)
    this.name = 'PhotoFileConflictError'
  }
}

export interface PhotoLibraryFileSystemPort {
  listPhotoFiles(rootPath: string): Promise<string[]>
  listDirectoryFileNames(directoryPath: string): Promise<string[]>
  ensureDirectory(path: string): Promise<void>
  copyFile(sourcePath: string, destinationPath: string): Promise<void>
  moveFile(sourcePath: string, destinationPath: string): Promise<void>
}
