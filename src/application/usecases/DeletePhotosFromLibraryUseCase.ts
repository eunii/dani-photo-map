import {
  type DeletePhotosFromLibraryCommand,
  deletePhotosFromLibraryCommandSchema
} from '@application/dto/DeletePhotosFromLibraryCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { deletePhotoFilesFromOutputRoot } from '@application/services/deletePhotoFilesFromOutputRoot'
import { loadLibraryIndexForMutations } from '@application/services/loadLibraryIndexForMutations'
import { removePhotosFromLibraryIndex } from '@application/services/removePhotosFromLibraryIndex'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

export class DeletePhotosFromLibraryUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly fileSystem: PhotoLibraryFileSystemPort,
    private readonly existingOutputScanner?: ExistingOutputScannerPort
  ) {}

  async execute(command: DeletePhotosFromLibraryCommand): Promise<LibraryIndex> {
    const validated = deletePhotosFromLibraryCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validated.outputRoot)
    const index = await loadLibraryIndexForMutations({
      outputRoot,
      libraryIndexStore: this.libraryIndexStore,
      existingOutputScanner: this.existingOutputScanner
    })
    const idSet = new Set(validated.photoIds)

    const photosToDelete = index.photos.filter((p) => idSet.has(p.id))

    if (photosToDelete.length !== idSet.size) {
      throw new Error('삭제할 사진 중 인덱스에 없는 항목이 있습니다.')
    }

    for (const photo of photosToDelete) {
      await deletePhotoFilesFromOutputRoot(outputRoot, photo, this.fileSystem)
    }

    const next = removePhotosFromLibraryIndex(index, idSet)
    await this.libraryIndexStore.save(next)

    return next
  }
}
