import {
  type DeleteOutputFolderSubtreeCommand,
  deleteOutputFolderSubtreeCommandSchema
} from '@application/dto/DeleteOutputFolderSubtreeCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { assertDeletableOutputPathSegments } from '@application/services/assertDeletableOutputPathSegments'
import { collectPhotoIdsUnderOutputPath } from '@application/services/collectPhotoIdsUnderOutputPath'
import { deletePhotoFilesFromOutputRoot } from '@application/services/deletePhotoFilesFromOutputRoot'
import { loadLibraryIndexForMutations } from '@application/services/loadLibraryIndexForMutations'
import { removePhotosFromLibraryIndex } from '@application/services/removePhotosFromLibraryIndex'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'
import {
  NO_OUTPUT_PATH_SEGMENT,
  ROOT_LEVEL_FILES_SEGMENT
} from '@shared/utils/outputRelativePath'
import { isResolvedPathUnderRoot } from '@shared/utils/pathScope'
import { join, resolve } from 'node:path'

export class DeleteOutputFolderSubtreeUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly fileSystem: PhotoLibraryFileSystemPort,
    private readonly existingOutputScanner?: ExistingOutputScannerPort
  ) {}

  async execute(command: DeleteOutputFolderSubtreeCommand): Promise<LibraryIndex> {
    const validated = deleteOutputFolderSubtreeCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validated.outputRoot)
    const pathSegments = validated.pathSegments

    assertDeletableOutputPathSegments(pathSegments)

    const index = await loadLibraryIndexForMutations({
      outputRoot,
      libraryIndexStore: this.libraryIndexStore,
      existingOutputScanner: this.existingOutputScanner
    })
    const photoIds = collectPhotoIdsUnderOutputPath(index.photos, pathSegments)

    if (photoIds.size === 0) {
      await this.removePhysicalFolderIfApplicable(outputRoot, pathSegments)
      return index
    }

    const photos = index.photos.filter((p) => photoIds.has(p.id))

    for (const photo of photos) {
      await deletePhotoFilesFromOutputRoot(outputRoot, photo, this.fileSystem)
    }

    await this.removePhysicalFolderIfApplicable(outputRoot, pathSegments)

    const next = removePhotosFromLibraryIndex(index, photoIds)
    await this.libraryIndexStore.save(next)

    return next
  }

  private async removePhysicalFolderIfApplicable(
    outputRoot: string,
    pathSegments: string[]
  ): Promise<void> {
    if (pathSegments.length === 1 && pathSegments[0] === NO_OUTPUT_PATH_SEGMENT) {
      return
    }

    if (pathSegments.length === 1 && pathSegments[0] === ROOT_LEVEL_FILES_SEGMENT) {
      return
    }

    const folderAbs = resolve(join(outputRoot, ...pathSegments))
    const rootResolved = resolve(outputRoot)

    if (folderAbs === rootResolved) {
      throw new Error('출력 루트 전체는 삭제할 수 없습니다.')
    }

    if (!isResolvedPathUnderRoot(outputRoot, folderAbs)) {
      throw new Error('삭제 경로가 출력 폴더 밖을 가리킵니다.')
    }

    await this.fileSystem.removeDirectoryRecursiveIfExists(folderAbs)
  }
}
