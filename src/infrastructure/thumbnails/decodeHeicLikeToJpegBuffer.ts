import { readFile } from 'node:fs/promises'

import heicConvert from 'heic-convert'

import { isHeicLikeLibraryFileName } from '@shared/constants/mediaExtensions'

/**
 * HEIC/HEIF 파일이면 JPEG 버퍼로 디코드해 반환합니다 (sharp가 HEIC를 못 읽어서 필요한 우회).
 * 그 외 포맷이면 `undefined`를 반환하고, 호출측이 sharp에 원본 경로를 직접 넘깁니다.
 */
export async function decodeHeicLikeToJpegBuffer(
  sourcePath: string
): Promise<Buffer | undefined> {
  if (!isHeicLikeLibraryFileName(sourcePath)) {
    return undefined
  }

  const heicBuffer = await readFile(sourcePath)

  return heicConvert({
    buffer: heicBuffer,
    format: 'JPEG',
    quality: 0.92
  })
}
