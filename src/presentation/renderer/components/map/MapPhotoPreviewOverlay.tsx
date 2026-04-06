import { useEffect, useState } from 'react'

import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import { getGpsBadge } from '@presentation/renderer/components/map/GroupPhotoGrid'
import type { GroupDetail } from '@shared/types/preload'

interface MapPhotoPreviewOverlayProps {
  outputRoot?: string
  group?: GroupDetail
  photoId?: string
  onChangePhoto: (photoId: string) => void
  onClose: () => void
}

export function MapPhotoPreviewOverlay({
  outputRoot,
  group,
  photoId,
  onChangePhoto,
  onClose
}: MapPhotoPreviewOverlayProps) {
  const photoIndex = group?.photos.findIndex((candidate) => candidate.id === photoId) ?? -1
  const photo = photoIndex >= 0 ? group?.photos[photoIndex] : undefined
  const previousPhoto = photoIndex > 0 ? group?.photos[photoIndex - 1] : undefined
  const nextPhoto =
    photoIndex >= 0 && group && photoIndex < group.photos.length - 1
      ? group.photos[photoIndex + 1]
      : undefined
  const [isLandscapeImage, setIsLandscapeImage] = useState(false)

  useEffect(() => {
    setIsLandscapeImage(false)
  }, [photo?.id])

  if (!group || !photo) {
    return null
  }

  const imageUrl =
    outputRoot &&
    toOutputFileUrl(
      outputRoot,
      photo.thumbnailRelativePath ?? photo.outputRelativePath
    )

  const metadataContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Photo Details
        </p>
        <p className="break-words text-base font-semibold text-slate-900">
          {photo.sourceFileName}
        </p>
        <p className="text-sm text-slate-500">{group.title || group.displayTitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
          {getGpsBadge(photo)}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
          {photoIndex + 1} / {group.photos.length}
        </span>
        {photo.regionName ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
            {photo.regionName}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <div>
          <p className="text-xs font-medium text-slate-500">촬영 시각</p>
          <p className="mt-1 break-words">{photo.capturedAtIso ?? '정보 없음'}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">그룹 표시명</p>
          <p className="mt-1 break-words">{group.displayTitle}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">대표 사진 여부</p>
          <p className="mt-1">
            {group.representativePhotoId === photo.id ? '대표 사진' : '일반 사진'}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950/35">
      <div className="pointer-events-auto absolute inset-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {photo.sourceFileName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {group.title || group.displayTitle}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div
          className={`flex min-h-0 flex-1 ${
            isLandscapeImage ? 'flex-col' : ''
          }`}
        >
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-slate-950 p-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={photo.sourceFileName}
                className={`block h-auto w-auto object-contain ${
                  isLandscapeImage
                    ? 'max-h-[calc(100%-24px)] max-w-[calc(100%-24px)]'
                    : 'max-h-[calc(100%-12px)] max-w-[calc(100%-120px)]'
                }`}
                onLoad={(event) => {
                  const image = event.currentTarget
                  setIsLandscapeImage(image.naturalWidth >= image.naturalHeight)
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                미리보기 이미지를 불러올 수 없습니다.
              </div>
            )}

            <button
              type="button"
              disabled={!previousPhoto}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/78 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:bg-slate-800/40 disabled:text-slate-400"
              onClick={() => previousPhoto && onChangePhoto(previousPhoto.id)}
            >
              ‹
            </button>

            <button
              type="button"
              disabled={!nextPhoto}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/78 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:bg-slate-800/40 disabled:text-slate-400"
              onClick={() => nextPhoto && onChangePhoto(nextPhoto.id)}
            >
              ›
            </button>
          </div>

          <div
            className={`shrink-0 overflow-y-auto bg-white p-5 ${
              isLandscapeImage
                ? 'max-h-[220px] border-t border-slate-200'
                : 'w-[320px] border-l border-slate-200'
            }`}
          >
            {metadataContent}
          </div>
        </div>
      </div>
    </div>
  )
}
