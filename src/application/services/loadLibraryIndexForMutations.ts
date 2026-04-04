import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { normalizePathSeparators } from '@shared/utils/path'

/**
 * 파일 목록·지도에 보이는 인덱스와 동일한 기준(출력 스캔 복구 id + 저장된 메타 병합)으로 로드합니다.
 * 디스크의 index.json만 읽으면 스캔 복구 시 부여된 id와 달라 삭제/이동이 실패할 수 있습니다.
 */
export async function loadLibraryIndexForMutations(params: {
  outputRoot: string
  libraryIndexStore: LibraryIndexStorePort
  existingOutputScanner?: ExistingOutputScannerPort
}): Promise<LibraryIndex> {
  const outputRoot = normalizePathSeparators(params.outputRoot)
  let storedIndex: LibraryIndex | null = null

  try {
    storedIndex = await params.libraryIndexStore.load(outputRoot)
  } catch {
    storedIndex = null
  }

  if (!params.existingOutputScanner) {
    if (storedIndex) {
      return storedIndex
    }
    throw new Error(`Library index not found under ${outputRoot}`)
  }

  const snapshot = await params.existingOutputScanner.scan(outputRoot)
  const rebuiltIndex = rebuildLibraryIndexFromExistingOutput(snapshot)

  if (!rebuiltIndex) {
    if (storedIndex) {
      return storedIndex
    }
    throw new Error(`Library index not found under ${outputRoot}`)
  }

  return mergeStoredLibraryMetadata(rebuiltIndex, storedIndex)
}
