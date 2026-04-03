import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'

export const LIBRARY_INDEX_VERSION = 1 as const

export interface LibraryIndex {
  version: typeof LIBRARY_INDEX_VERSION
  generatedAt: string
  sourceRoot: string
  outputRoot: string
  photos: Photo[]
  groups: PhotoGroup[]
}
