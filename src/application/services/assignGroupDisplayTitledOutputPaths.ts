import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import {
  buildGroupDisplayTitledPhotoOutputRelativePath,
  buildPhotoOutputDirectoryRelativePath
} from '@domain/services/PhotoNamingService'
import { joinPathSegments } from '@shared/utils/path'

export interface AssignGroupDisplayTitledOutputPathsParams {
  photos: Photo[]
  photoIdToDisplayTitle: Map<string, string>
  outputRoot: string
  rules: OrganizationRules
  fileSystem: Pick<PhotoLibraryFileSystemPort, 'listDirectoryFileNames'>
}

/**
 * 그룹 표시명 기반 출력 상대 경로를 부여합니다. 디렉터리별로 디스크에 이미 있는 파일명과
 * 이번 실행에서 이미 배정한 이름을 합쳐 충돌 시 `_001` … 접미를 붙입니다.
 */
export async function assignGroupDisplayTitledOutputRelativePaths(
  params: AssignGroupDisplayTitledOutputPathsParams
): Promise<Map<string, string>> {
  const { photos, photoIdToDisplayTitle, outputRoot, rules, fileSystem } = params
  const result = new Map<string, string>()
  const occupiedByDirectory = new Map<string, Set<string>>()

  const sorted = [...photos].sort((left, right) => {
    const leftIso = left.capturedAt?.iso ?? ''
    const rightIso = right.capturedAt?.iso ?? ''

    if (leftIso !== rightIso) {
      return leftIso.localeCompare(rightIso)
    }

    return left.sourcePath.localeCompare(right.sourcePath)
  })

  for (const photo of sorted) {
    const displayTitle = photoIdToDisplayTitle.get(photo.id)

    if (!displayTitle) {
      continue
    }

    const dirRel = buildPhotoOutputDirectoryRelativePath(photo, rules)
    const dirAbs = joinPathSegments(outputRoot, dirRel)

    let occupied = occupiedByDirectory.get(dirRel)

    if (!occupied) {
      const onDisk = await fileSystem.listDirectoryFileNames(dirAbs)

      occupied = new Set(onDisk)
      occupiedByDirectory.set(dirRel, occupied)
    }

    let seq = 0

    while (true) {
      const suffix = seq === 0 ? '' : `_${String(seq).padStart(3, '0')}`
      const relPath = buildGroupDisplayTitledPhotoOutputRelativePath(
        photo,
        displayTitle,
        rules,
        suffix
      )
      const fileName = relPath.split('/').pop()!

      if (!occupied.has(fileName)) {
        occupied.add(fileName)
        result.set(photo.id, relPath)
        break
      }

      seq += 1
    }
  }

  return result
}
