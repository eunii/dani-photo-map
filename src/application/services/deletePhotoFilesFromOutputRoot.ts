import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { Photo } from '@domain/entities/Photo'
import { joinPathSegments, normalizePathSeparators } from '@shared/utils/path'
import { isResolvedPathUnderRoot } from '@shared/utils/pathScope'

export async function deletePhotoFilesFromOutputRoot(
  outputRoot: string,
  photo: Photo,
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'removeFileIfExists'>
): Promise<void> {
  if (photo.outputRelativePath) {
    const abs = joinPathSegments(
      outputRoot,
      normalizePathSeparators(photo.outputRelativePath)
    )
    if (!isResolvedPathUnderRoot(outputRoot, abs)) {
      throw new Error(`출력 경로가 라이브러리 루트 밖을 가리킵니다: ${photo.outputRelativePath}`)
    }
    await fileSystem.removeFileIfExists(abs)
  }
  if (photo.thumbnailRelativePath) {
    const abs = joinPathSegments(
      outputRoot,
      normalizePathSeparators(photo.thumbnailRelativePath)
    )
    if (!isResolvedPathUnderRoot(outputRoot, abs)) {
      throw new Error(`썸네일 경로가 라이브러리 루트 밖을 가리킵니다: ${photo.thumbnailRelativePath}`)
    }
    await fileSystem.removeFileIfExists(abs)
  }
}
