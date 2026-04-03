export interface PhotoHasherPort {
  createSha256(sourcePath: string): Promise<string>
}
