export interface PhotoLibraryFileSystemPort {
  listPhotoFiles(rootPath: string): Promise<string[]>
  ensureDirectory(path: string): Promise<void>
  copyFile(sourcePath: string, destinationPath: string): Promise<void>
}
