export interface ThumbnailGeneratorPort {
  generateForPhoto(sourcePath: string): Promise<string>
}
