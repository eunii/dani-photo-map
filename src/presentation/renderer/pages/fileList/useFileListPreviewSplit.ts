import {
  useCallback,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent
} from 'react'

const PREVIEW_PANEL_DEFAULT_WIDTH = 260
const PREVIEW_PANEL_MIN_WIDTH = 200
const PREVIEW_PANEL_MAX_WIDTH = 480
const GRID_PANEL_MIN_WIDTH = 320

export function useFileListPreviewSplit() {
  const [previewPanelWidth, setPreviewPanelWidth] = useState(
    PREVIEW_PANEL_DEFAULT_WIDTH
  )
  const splitLayoutRef = useRef<HTMLDivElement | null>(null)

  const handleStartPreviewResize = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>): void => {
      const container = splitLayoutRef.current

      if (!container) {
        return
      }

      event.preventDefault()
      const startX = event.clientX
      const startWidth = previewPanelWidth

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX
        const containerWidth = container.clientWidth
        const maxByContainer = Math.max(
          PREVIEW_PANEL_MIN_WIDTH,
          containerWidth - GRID_PANEL_MIN_WIDTH - 8
        )
        const clampedWidth = Math.min(
          Math.max(startWidth - deltaX, PREVIEW_PANEL_MIN_WIDTH),
          Math.min(PREVIEW_PANEL_MAX_WIDTH, maxByContainer)
        )
        setPreviewPanelWidth(clampedWidth)
      }

      const handleMouseUp = (): void => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [previewPanelWidth]
  )

  return {
    splitLayoutRef,
    previewPanelWidth,
    handleStartPreviewResize
  }
}
