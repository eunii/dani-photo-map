import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'

export interface LibraryIndex {
  version: number
  generatedAt: string
  sourceRoot: string
  outputRoot: string
  photos: Photo[]
  groups: PhotoGroup[]
}
