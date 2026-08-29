export interface ThumbnailGeneratorPort {
  generateForPhoto(sourcePath: string): Promise<string>
  /** Releases any background resources (e.g. worker threads). Optional — most implementations need nothing. */
  dispose?(): Promise<void>
}
