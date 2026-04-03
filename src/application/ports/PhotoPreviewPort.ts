export interface PhotoPreviewPort {
  createDataUrl(sourcePath: string): Promise<string>
}
