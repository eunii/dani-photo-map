import {
  type UpdatePhotoGroupCommand,
  updatePhotoGroupCommandSchema
} from '@application/dto/UpdatePhotoGroupCommand'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
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
  constructor(private readonly libraryIndexStore: LibraryIndexStorePort) {}

  async execute(command: UpdatePhotoGroupCommand): Promise<LibraryIndex> {
    const validatedCommand = updatePhotoGroupCommandSchema.parse(command)
    const outputRoot = normalizePathSeparators(validatedCommand.outputRoot)
    const index = await this.libraryIndexStore.load(outputRoot)

    if (!index) {
      throw new Error(`Library index not found under ${outputRoot}`)
    }

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

    const updatedGroups = index.groups.map((currentGroup) =>
      currentGroup.id === validatedCommand.groupId
        ? {
            ...currentGroup,
            title: normalizeTitle(validatedCommand.title, currentGroup.displayTitle),
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
      groups: updatedGroups
    }

    await this.libraryIndexStore.save(updatedIndex)

    return updatedIndex
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
