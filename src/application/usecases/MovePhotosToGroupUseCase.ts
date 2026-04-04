import {
  type MovePhotosToGroupCommand,
  movePhotosToGroupCommandSchema
} from '@application/dto/MovePhotosToGroupCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { mergeGroupsByMatchingTitle } from '@application/services/mergeGroupsByMatchingTitle'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { defaultOrganizationRules, type OrganizationRules } from '@domain/policies/OrganizationRules'
import { normalizePathSeparators } from '@shared/utils/path'

export class MovePhotosToGroupUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly fileSystem: PhotoLibraryFileSystemPort,
    private readonly existingOutputScanner?: ExistingOutputScannerPort,
    private readonly rules: OrganizationRules = defaultOrganizationRules
  ) {}

  async execute(command: MovePhotosToGroupCommand): Promise<LibraryIndex> {
    const validatedCommand = movePhotosToGroupCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)
    const index = await this.loadEditableIndex(outputRoot)
    const afterMove = await movePhotosIntoGroup({
      index,
      outputRoot,
      sourceGroupId: validatedCommand.sourceGroupId,
      destinationGroupId: validatedCommand.destinationGroupId,
      photoIds: validatedCommand.photoIds,
      fileSystem: this.fileSystem,
      rules: this.rules
    })

    const mergedIndex = await mergeGroupsByMatchingTitle({
      index: afterMove,
      outputRoot,
      fileSystem: this.fileSystem,
      rules: this.rules
    })

    await this.libraryIndexStore.save(mergedIndex)

    return mergedIndex
  }

  private async loadEditableIndex(outputRoot: string): Promise<LibraryIndex> {
    try {
      const storedIndex = await this.libraryIndexStore.load(outputRoot)

      if (storedIndex) {
        return storedIndex
      }
    } catch {
      // Corrupted index.json should fall back to the output scan.
    }

    if (!this.existingOutputScanner) {
      throw new Error(`Library index not found under ${outputRoot}`)
    }

    const snapshot = await this.existingOutputScanner.scan(outputRoot)
    const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot)

    if (!rebuiltIndex) {
      throw new Error(`Library index not found under ${outputRoot}`)
    }

    return rebuiltIndex
  }
}
