import {
  type UpdatePhotoGroupCommand,
  updatePhotoGroupCommandSchema
} from '@application/dto/UpdatePhotoGroupCommand'
import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { defaultOrganizationRules, type OrganizationRules } from '@domain/policies/OrganizationRules'
import {
  buildGroupAwarePhotoOutputRelativePath,
  createGroupAwarePhotoFileNamePrefix
} from '@domain/services/GroupAwarePhotoNamingService'
import {
  getPathBaseName,
  getPathDirectoryName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

interface PlannedRename {
  photoId: string
  currentAbsolutePath: string
  nextAbsolutePath: string
  nextOutputRelativePath: string
}

interface RenameablePhoto extends Photo {
  regionName: string
  outputRelativePath: string
}

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
    const renamePlan = await this.createRenamePlan(
      group,
      index.photos,
      outputRoot,
      nextTitle
    )

    await this.applyRenamePlan(renamePlan)

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

  private async createRenamePlan(
    group: PhotoGroup,
    photos: Photo[],
    outputRoot: string,
    groupTitle: string
  ): Promise<PlannedRename[]> {
    const groupPhotos = group.photoIds
      .map((photoId) => photos.find((photo) => photo.id === photoId))
      .filter((photo): photo is Photo => photo !== undefined)
      .map((photo) => this.toRenameablePhoto(photo))
      .filter((photo): photo is RenameablePhoto => photo !== null)
      .sort((left, right) => {
        const leftCapturedAt = left.capturedAt?.iso ?? ''
        const rightCapturedAt = right.capturedAt?.iso ?? ''

        if (leftCapturedAt !== rightCapturedAt) {
          return leftCapturedAt.localeCompare(rightCapturedAt)
        }

        return left.sourceFileName.localeCompare(right.sourceFileName)
      })
    const currentFileNamesByDirectory = new Map<string, Set<string>>()

    for (const photo of groupPhotos) {
      const currentDirectoryPath = getPathDirectoryName(photo.outputRelativePath)
      const currentFileName = getPathBaseName(photo.outputRelativePath)
      const currentFileNames = currentFileNamesByDirectory.get(currentDirectoryPath) ?? new Set<string>()

      currentFileNames.add(currentFileName)
      currentFileNamesByDirectory.set(currentDirectoryPath, currentFileNames)
    }

    const occupiedFileNamesByDirectory = new Map<string, Set<string>>()
    const renamePlan: PlannedRename[] = []

    for (const photo of groupPhotos) {
      const targetDirectoryPath = getPathDirectoryName(
        buildGroupAwarePhotoOutputRelativePath(photo, groupTitle, 1, this.rules)
      )
      const targetDirectoryAbsolutePath = joinPathSegments(
        outputRoot,
        targetDirectoryPath
      )
      const occupiedFileNames = await this.getOccupiedFileNames(
        targetDirectoryPath,
        targetDirectoryAbsolutePath,
        currentFileNamesByDirectory,
        occupiedFileNamesByDirectory
      )
      const nextSequenceNumber = this.findNextSequenceNumber(
        occupiedFileNames,
        photo,
        groupTitle
      )
      const nextOutputRelativePath = buildGroupAwarePhotoOutputRelativePath(
        photo,
        groupTitle,
        nextSequenceNumber,
        this.rules
      )
      const nextFileName = getPathBaseName(nextOutputRelativePath)

      occupiedFileNames.add(nextFileName)
      renamePlan.push({
        photoId: photo.id,
        currentAbsolutePath: joinPathSegments(outputRoot, photo.outputRelativePath),
        nextAbsolutePath: joinPathSegments(outputRoot, nextOutputRelativePath),
        nextOutputRelativePath
      })
    }

    return renamePlan
  }

  private async getOccupiedFileNames(
    targetDirectoryPath: string,
    targetDirectoryAbsolutePath: string,
    currentFileNamesByDirectory: Map<string, Set<string>>,
    occupiedFileNamesByDirectory: Map<string, Set<string>>
  ): Promise<Set<string>> {
    const existingOccupiedFileNames =
      occupiedFileNamesByDirectory.get(targetDirectoryPath)

    if (existingOccupiedFileNames) {
      return existingOccupiedFileNames
    }

    const directoryFileNames = new Set(
      await this.fileSystem.listDirectoryFileNames(targetDirectoryAbsolutePath)
    )
    const currentFileNames = currentFileNamesByDirectory.get(targetDirectoryPath) ?? new Set<string>()

    for (const currentFileName of currentFileNames) {
      directoryFileNames.delete(currentFileName)
    }

    occupiedFileNamesByDirectory.set(targetDirectoryPath, directoryFileNames)

    return directoryFileNames
  }

  private findNextSequenceNumber(
    occupiedFileNames: Set<string>,
    photo: Photo,
    groupTitle: string
  ): number {
    const prefix = createGroupAwarePhotoFileNamePrefix(
      groupTitle,
      photo.capturedAt
    )
    const fileName = photo.sourceFileName
    const lastDotIndex = fileName.lastIndexOf('.')
    const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : ''
    const pattern = new RegExp(
      `^${this.escapeRegExp(prefix)}_(\\d+)${this.escapeRegExp(extension)}$`
    )
    let maxSequenceNumber = 0

    for (const occupiedFileName of occupiedFileNames) {
      const match = occupiedFileName.match(pattern)

      if (!match) {
        continue
      }

      const sequenceNumber = Number.parseInt(match[1] ?? '0', 10)

      if (sequenceNumber > maxSequenceNumber) {
        maxSequenceNumber = sequenceNumber
      }
    }

    return maxSequenceNumber + 1
  }

  private async applyRenamePlan(renamePlan: PlannedRename[]): Promise<void> {
    const temporaryRenamePlan = renamePlan
      .filter((plan) => plan.currentAbsolutePath !== plan.nextAbsolutePath)
      .map((plan, index) => ({
        ...plan,
        temporaryAbsolutePath: `${plan.currentAbsolutePath}.photo-organizer-${Date.now()}-${index}.tmp`
      }))

    for (const plan of temporaryRenamePlan) {
      await this.fileSystem.moveFile(plan.currentAbsolutePath, plan.temporaryAbsolutePath)
    }

    for (const plan of temporaryRenamePlan) {
      await this.fileSystem.ensureDirectory(
        getPathDirectoryName(plan.nextAbsolutePath)
      )
      await this.fileSystem.moveFile(plan.temporaryAbsolutePath, plan.nextAbsolutePath)
    }
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

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private toRenameablePhoto(photo: Photo): RenameablePhoto | null {
    if (!photo.outputRelativePath) {
      return null
    }

    const normalizedOutputRelativePath = normalizePathSeparators(photo.outputRelativePath)
    const pathSegments = normalizedOutputRelativePath.split('/')
    const regionNameFromPath = pathSegments.at(-2)
    const regionName = photo.regionName ?? regionNameFromPath

    if (!regionName) {
      return null
    }

    return {
      ...photo,
      regionName,
      outputRelativePath: normalizedOutputRelativePath
    }
  }
}
