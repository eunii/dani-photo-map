import {
  type UpdatePhotoGroupCommand,
  updatePhotoGroupCommandSchema
} from '@application/dto/UpdatePhotoGroupCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import {
  applyRenamePlan,
  createGroupAwareRenamePlan
} from '@application/services/groupAwarePhotoRelocation'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { defaultOrganizationRules, type OrganizationRules } from '@domain/policies/OrganizationRules'
import { normalizePathSeparators } from '@shared/utils/path'

function normalizeCompanions(companions: string[]): string[] {
  return Array.from(
    new Set(
      companions
        .map((companion) => companion.trim())
        .filter((companion) => companion.length > 0)
    )
  )
}

function normalizeNotes(notes?: string): string | undefined {
  const trimmedNotes = notes?.trim()

  return trimmedNotes ? trimmedNotes : undefined
}

function normalizeTitle(title: string, fallbackTitle: string): string {
  const trimmedTitle = title.trim()

  return trimmedTitle || fallbackTitle
}

export class UpdatePhotoGroupUseCase {
  constructor(
    private readonly libraryIndexStore: LibraryIndexStorePort,
    private readonly fileSystem: PhotoLibraryFileSystemPort,
    private readonly existingOutputScanner?: ExistingOutputScannerPort,
    private readonly rules: OrganizationRules = defaultOrganizationRules
  ) {}

  async execute(command: UpdatePhotoGroupCommand): Promise<LibraryIndex> {
    const validatedCommand = updatePhotoGroupCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)
    const index = await this.loadEditableIndex(outputRoot)

    const group = index.groups.find(
      (currentGroup) => currentGroup.id === validatedCommand.groupId
    )

    if (!group) {
      throw new Error(`Photo group not found: ${validatedCommand.groupId}`)
    }

    const representativePhotoId = this.resolveRepresentativePhotoId(
      validatedCommand.representativePhotoId,
      group
    )
    const representativePhoto = representativePhotoId
      ? index.photos.find((photo) => photo.id === representativePhotoId)
      : undefined
    const nextTitle = normalizeTitle(validatedCommand.title, group.displayTitle)
    const renamePlan = await createGroupAwareRenamePlan({
      photos: group.photoIds
        .map((photoId) => index.photos.find((photo) => photo.id === photoId))
        .filter((photo) => photo !== undefined),
      outputRoot,
      groupTitle: nextTitle,
      fileSystem: this.fileSystem,
      rules: this.rules
    })

    await applyRenamePlan(renamePlan, this.fileSystem)

    const updatedPhotos = index.photos.map((photo) => {
      const plannedRename = renamePlan.find((plan) => plan.photoId === photo.id)

      return plannedRename
        ? {
            ...photo,
            outputRelativePath: plannedRename.nextOutputRelativePath
          }
        : photo
    })

    const updatedGroups = index.groups.map((currentGroup) =>
      currentGroup.id === validatedCommand.groupId
        ? {
            ...currentGroup,
            title: nextTitle,
            companions: normalizeCompanions(validatedCommand.companions),
            notes: normalizeNotes(validatedCommand.notes),
            representativePhotoId,
            representativeGps: representativePhoto?.gps,
            representativeThumbnailRelativePath:
              representativePhoto?.thumbnailRelativePath
          }
        : currentGroup
    )
    const updatedIndex: LibraryIndex = {
      ...index,
      photos: updatedPhotos,
      groups: updatedGroups
    }

    await this.libraryIndexStore.save(updatedIndex)

    return updatedIndex
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

  private resolveRepresentativePhotoId(
    representativePhotoId: string | undefined,
    group: PhotoGroup
  ): string | undefined {
    if (!representativePhotoId) {
      return group.representativePhotoId
    }

    if (!group.photoIds.includes(representativePhotoId)) {
      throw new Error(
        `Representative photo does not belong to group: ${representativePhotoId}`
      )
    }

    return representativePhotoId
  }
}
