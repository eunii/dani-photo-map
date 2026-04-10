import { join } from 'node:path'

import { DeleteOutputFolderSubtreeUseCase } from '@application/usecases/DeleteOutputFolderSubtreeUseCase'
import { DeletePhotosFromLibraryUseCase } from '@application/usecases/DeletePhotosFromLibraryUseCase'
import { LoadLibraryGroupDetailUseCase } from '@application/usecases/LoadLibraryGroupDetailUseCase'
import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'
import { MovePhotosToGroupUseCase } from '@application/usecases/MovePhotosToGroupUseCase'
import { PreviewPendingOrganizationUseCase } from '@application/usecases/PreviewPendingOrganizationUseCase'
import { ScanPhotoLibraryUseCase } from '@application/usecases/ScanPhotoLibraryUseCase'
import { UpdatePhotoGroupUseCase } from '@application/usecases/UpdatePhotoGroupUseCase'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { ExistingOutputLibraryScanner } from '@infrastructure/filesystem/ExistingOutputLibraryScanner'
import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'
import { NodePhotoLibraryFileSystem } from '@infrastructure/filesystem/NodePhotoLibraryFileSystem'
import { CachedRegionResolver } from '@infrastructure/geo/CachedRegionResolver'
import { CuratedRegionResolver } from '@infrastructure/geo/CuratedRegionResolver'
import { FallbackRegionResolver } from '@infrastructure/geo/FallbackRegionResolver'
import { NodePhotoHasher } from '@infrastructure/hashing/NodePhotoHasher'
import { JsonLibraryIndexStore } from '@infrastructure/storage/JsonLibraryIndexStore'
import { SharpPhotoPreviewGenerator } from '@infrastructure/thumbnails/SharpPhotoPreviewGenerator'
import { SharpThumbnailGenerator } from '@infrastructure/thumbnails/SharpThumbnailGenerator'
import type { ScanPhotoLibraryRequest } from '@shared/types/preload'

function createLibraryIndexStore(): JsonLibraryIndexStore {
  return new JsonLibraryIndexStore(defaultOrganizationRules.outputIndexRelativePath)
}

function createRegionResolver(): CachedRegionResolver {
  return new CachedRegionResolver(
    new CuratedRegionResolver(
      new FallbackRegionResolver(defaultOrganizationRules.unknownRegionLabel)
    )
  )
}

export function createScanPhotoLibraryUseCase(command: ScanPhotoLibraryRequest) {
  const rules = defaultOrganizationRules
  const thumbnailsRootPath = join(
    command.outputRoot,
    rules.outputThumbnailsRelativePath
  )

  return new ScanPhotoLibraryUseCase({
    fileSystem: new NodePhotoLibraryFileSystem(),
    metadataReader: new ExifrPhotoMetadataReader(),
    hasher: new NodePhotoHasher(),
    regionResolver: createRegionResolver(),
    thumbnailGenerator: new SharpThumbnailGenerator(thumbnailsRootPath),
    libraryIndexStore: createLibraryIndexStore(),
    existingOutputScanner: new ExistingOutputLibraryScanner(rules),
    rules
  })
}

export function createLoadLibraryIndexUseCase(): LoadLibraryIndexUseCase {
  return new LoadLibraryIndexUseCase(
    createLibraryIndexStore(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules)
  )
}

export function createLoadLibraryGroupDetailUseCase(): LoadLibraryGroupDetailUseCase {
  return new LoadLibraryGroupDetailUseCase(
    createLibraryIndexStore(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules)
  )
}

export function createPreviewPendingOrganizationUseCase(): PreviewPendingOrganizationUseCase {
  const rules = defaultOrganizationRules

  return new PreviewPendingOrganizationUseCase({
    fileSystem: new NodePhotoLibraryFileSystem(),
    metadataReader: new ExifrPhotoMetadataReader(),
    hasher: new NodePhotoHasher(),
    regionResolver: createRegionResolver(),
    photoPreview: new SharpPhotoPreviewGenerator(),
    libraryIndexStore: createLibraryIndexStore(),
    existingOutputScanner: new ExistingOutputLibraryScanner(rules),
    rules
  })
}

export function createUpdatePhotoGroupUseCase(): UpdatePhotoGroupUseCase {
  return new UpdatePhotoGroupUseCase(
    createLibraryIndexStore(),
    new NodePhotoLibraryFileSystem(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules),
    defaultOrganizationRules
  )
}

export function createMovePhotosToGroupUseCase(): MovePhotosToGroupUseCase {
  return new MovePhotosToGroupUseCase(
    createLibraryIndexStore(),
    new NodePhotoLibraryFileSystem(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules),
    defaultOrganizationRules
  )
}

export function createDeletePhotosFromLibraryUseCase(): DeletePhotosFromLibraryUseCase {
  return new DeletePhotosFromLibraryUseCase(
    createLibraryIndexStore(),
    new NodePhotoLibraryFileSystem(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules)
  )
}

export function createDeleteOutputFolderSubtreeUseCase(): DeleteOutputFolderSubtreeUseCase {
  return new DeleteOutputFolderSubtreeUseCase(
    createLibraryIndexStore(),
    new NodePhotoLibraryFileSystem(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules)
  )
}
