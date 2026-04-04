import { randomUUID } from 'node:crypto'

import {
  type MovePhotosToGroupCommand,
  movePhotosToGroupCommandSchema
} from '@application/dto/MovePhotosToGroupCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { groupPhotoIdsBySourceGroup } from '@application/services/groupPhotoIdsBySourceGroup'
import { mergeGroupsByMatchingTitle } from '@application/services/mergeGroupsByMatchingTitle'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import { defaultOrganizationRules, type OrganizationRules } from '@domain/policies/OrganizationRules'
import { normalizePathSeparators } from '@shared/utils/path'

function pickRepresentativeGpsFromPhotoIds(
  index: LibraryIndex,
  photoIds: string[]
): GeoPoint | undefined {
  const byId = new Map(index.photos.map((p) => [p.id, p] as const))

  for (const id of photoIds) {
    const photo = byId.get(id)

    if (photo?.gps) {
      return photo.gps
    }
  }

  return undefined
}

function allowDestinationWithoutGpsForIndex(
  index: LibraryIndex,
  destinationGroupId: string
): boolean {
  const dest = index.groups.find((group) => group.id === destinationGroupId)

  return Boolean(dest && !dest.representativeGps)
}

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
    let index = await this.loadEditableIndex(outputRoot)

    const photoIds = Array.from(new Set(validatedCommand.photoIds))

    let destinationGroupId: string

    if (validatedCommand.newGroup) {
      const key = `group|manual-${randomUUID()}`
      const title = validatedCommand.newGroup.title.trim()
      const representativeGps = pickRepresentativeGpsFromPhotoIds(index, photoIds)
      const newGroup: PhotoGroup = {
        id: key,
        groupKey: key,
        title,
        displayTitle: title,
        photoIds: [],
        companions: [],
        representativeGps,
        notes: undefined
      }

      index = {
        ...index,
        groups: [...index.groups, newGroup]
      }
      destinationGroupId = key
    } else {
      destinationGroupId = validatedCommand.destinationGroupId!
    }

    const destExists = index.groups.some((group) => group.id === destinationGroupId)

    if (!destExists) {
      throw new Error(`Destination photo group not found: ${destinationGroupId}`)
    }

    let afterMove: LibraryIndex

    if (validatedCommand.sourceGroupId) {
      for (const photoId of photoIds) {
        const group = index.groups.find((g) => g.photoIds.includes(photoId))

        if (group?.id !== validatedCommand.sourceGroupId) {
          throw new Error(
            `Photo does not belong to source group: ${photoId}`
          )
        }
      }

      afterMove = await movePhotosIntoGroup({
        index,
        outputRoot,
        sourceGroupId: validatedCommand.sourceGroupId,
        destinationGroupId,
        photoIds,
        fileSystem: this.fileSystem,
        rules: this.rules,
        allowDestinationWithoutGps: allowDestinationWithoutGpsForIndex(
          index,
          destinationGroupId
        )
      })
    } else {
      const bySource = groupPhotoIdsBySourceGroup(index, photoIds)
      let next = index

      for (const [sourceGroupId, ids] of [...bySource.entries()].sort((a, b) =>
        a[0].localeCompare(b[0])
      )) {
        if (sourceGroupId === destinationGroupId) {
          continue
        }

        next = await movePhotosIntoGroup({
          index: next,
          outputRoot,
          sourceGroupId,
          destinationGroupId,
          photoIds: ids,
          fileSystem: this.fileSystem,
          rules: this.rules,
          allowDestinationWithoutGps: allowDestinationWithoutGpsForIndex(
            next,
            destinationGroupId
          )
        })
      }

      afterMove = next
    }

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
