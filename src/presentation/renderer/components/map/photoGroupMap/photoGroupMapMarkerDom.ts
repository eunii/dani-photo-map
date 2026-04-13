import maplibregl from 'maplibre-gl'

import type {
  MapGroupRecord,
  MapPhotoPinRecord
} from '@presentation/renderer/view-models/map/mapPageSelectors'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'

export function getMarkerRenderKey(
  group: MapGroupRecord,
  outputRoot?: string
): string {
  return [
    outputRoot ?? '',
    group.displayTitle,
    group.group.representativeThumbnailRelativePath ?? '',
    group.group.representativeOutputRelativePath ?? ''
  ].join('|')
}

export function buildGroupMarkerElement(
  group: MapGroupRecord,
  outputRoot: string | undefined,
  options: {
    onSelectGroup: (groupId: string) => void
    getMap: () => maplibregl.Map | null
  }
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', group.displayTitle)
  button.style.width = '58px'
  button.style.height = '58px'
  button.style.transformOrigin = 'center center'
  button.style.backgroundColor = '#e2e8f0'

  const thumbnailUrl = outputRoot
    ? toOutputFileUrl(
        outputRoot,
        group.group.representativeThumbnailRelativePath ??
          group.group.representativeOutputRelativePath
      )
    : undefined

  const placeholder = document.createElement('div')
  placeholder.className =
    'flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-semibold tracking-wide text-slate-700'
  placeholder.textContent = 'PHOTO'
  button.appendChild(placeholder)

  if (thumbnailUrl) {
    const image = document.createElement('img')
    image.src = thumbnailUrl
    image.alt = group.displayTitle
    image.className = 'absolute inset-0 h-full w-full object-cover'
    image.loading = 'lazy'
    image.addEventListener('load', () => {
      placeholder.style.display = 'none'
    })
    image.addEventListener('error', () => {
      image.remove()
      placeholder.style.display = 'flex'
    })
    button.appendChild(image)
  }

  button.addEventListener('click', () => {
    options.onSelectGroup(group.group.id)

    if (!group.pinLocation) {
      return
    }

    const map = options.getMap()

    if (!map) {
      return
    }

    map.stop()
    map.easeTo({
      center: [group.pinLocation.longitude, group.pinLocation.latitude],
      zoom: Math.min(map.getZoom() + 1.25, 17),
      duration: 450,
      essential: true
    })
  })

  return button
}

export function buildFocusedPhotoMarkerElement(
  photo: MapPhotoPinRecord,
  outputRoot: string | undefined,
  options: { onSelectPhoto: (photoId: string) => void }
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', photo.sourceFileName)
  button.style.width = '74px'
  button.style.height = '74px'
  button.style.transformOrigin = 'center center'
  button.className =
    'relative overflow-hidden rounded-2xl border-4 border-sky-500 bg-white shadow-2xl ring-4 ring-sky-200'

  const thumbnailUrl = outputRoot
    ? toOutputFileUrl(
        outputRoot,
        photo.thumbnailRelativePath ?? photo.outputRelativePath
      )
    : undefined

  const placeholder = document.createElement('div')
  placeholder.className =
    'flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-semibold tracking-wide text-slate-700'
  placeholder.textContent = 'PHOTO'
  button.appendChild(placeholder)

  if (thumbnailUrl) {
    const image = document.createElement('img')
    image.src = thumbnailUrl
    image.alt = photo.sourceFileName
    image.className = 'absolute inset-0 h-full w-full object-cover'
    image.loading = 'lazy'
    image.addEventListener('load', () => {
      placeholder.style.display = 'none'
    })
    image.addEventListener('error', () => {
      image.remove()
      placeholder.style.display = 'flex'
    })
    button.appendChild(image)
  }

  const badge = document.createElement('div')
  badge.className =
    'pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-semibold text-white'
  badge.textContent = photo.isRepresentative ? 'REP' : 'PHOTO'
  button.appendChild(badge)

  button.addEventListener('click', () => {
    options.onSelectPhoto(photo.photoId)
  })

  return button
}
