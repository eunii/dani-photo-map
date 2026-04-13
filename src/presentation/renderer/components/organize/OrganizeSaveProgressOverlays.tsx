import type { PreviewPendingOrganizationResult } from '@shared/types/preload'
import { SaveProgressCard } from '@presentation/renderer/components/organize/SaveProgressCard'
import {
  effectiveGroupTitle,
  getGroupLinePercent,
  type GroupSavePhase
} from '@presentation/renderer/pages/organize/organizeGroupForm'

type PreviewGroup = PreviewPendingOrganizationResult['groups'][number]

interface OrganizeSaveProgressOverlaysProps {
  bulkSaveActive: boolean
  savePipelineBusy: boolean
  hidePreviewPanelWhileSaving: boolean
  previewResult: PreviewPendingOrganizationResult | null
  hasPendingPreviewGroups: boolean
  bulkRunStartIndex: number | null
  orderedPreviewGroups: PreviewGroup[]
  photoFlowTotal: number
  totalPhotosInPreview: number
  photosSavedCount: number
  prepareProgress: { completed: number; total: number } | null
  groupSavePhaseByKey: Record<string, GroupSavePhase>
  runningSaveTarget: string | null
  activeSaveJobMeta: {
    progressOffsetBeforeJob: number
    groupPhotoCount: number
  } | null
  groupTitleInputs: Record<string, string>
  onCancelRemaining: () => void
}

export function OrganizeSaveProgressOverlays({
  bulkSaveActive,
  savePipelineBusy,
  hidePreviewPanelWhileSaving,
  previewResult,
  hasPendingPreviewGroups,
  bulkRunStartIndex,
  orderedPreviewGroups,
  photoFlowTotal,
  totalPhotosInPreview,
  photosSavedCount,
  prepareProgress,
  groupSavePhaseByKey,
  runningSaveTarget,
  activeSaveJobMeta,
  groupTitleInputs,
  onCancelRemaining
}: OrganizeSaveProgressOverlaysProps) {
  const bulkOverlay =
    bulkSaveActive && savePipelineBusy ? (
      (() => {
        const denom =
          photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview || 1
        const overallPct = Math.min(
          100,
          Math.round((photosSavedCount / denom) * 100)
        )
        const targetGroups =
          bulkRunStartIndex != null
            ? orderedPreviewGroups.slice(bulkRunStartIndex)
            : orderedPreviewGroups
        const groupLines = targetGroups.map((g) => {
          const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
          const linePct = getGroupLinePercent(
            phase,
            runningSaveTarget,
            g.groupKey,
            activeSaveJobMeta,
            photosSavedCount
          )
          return {
            key: g.groupKey,
            title: effectiveGroupTitle(g, groupTitleInputs),
            phase,
            linePct
          }
        })

        return (
          <SaveProgressCard
            title="이후 그룹 일괄 저장 진행 중"
            description="현재 위저드 위치부터 남은 그룹만 복사·인덱스에 반영합니다. 막대에는 원본 읽기·해시와 복사·썸네일이 함께 반영됩니다."
            prepareProgressText={
              prepareProgress
                ? `원본 읽기·해시 (현재 그룹) ${prepareProgress.completed} / ${prepareProgress.total}장`
                : null
            }
            overallPct={overallPct}
            processedCount={photosSavedCount}
            totalCount={denom}
            groupLines={groupLines}
            footerText="현재 그룹마다 원본 처리(절반)와 저장(절반)을 합산해 전체 막대가 움직입니다. 진행 중인 그룹은 끝날 때까지 걸릴 수 있습니다."
            ariaBusy={runningSaveTarget !== null}
            onCancelRemaining={onCancelRemaining}
          />
        )
      })()
    ) : null

  const singleOverlay =
    hidePreviewPanelWhileSaving &&
    previewResult &&
    savePipelineBusy &&
    hasPendingPreviewGroups &&
    !bulkSaveActive ? (
      (() => {
        const denom =
          photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview || 1
        const overallPct =
          denom > 0
            ? Math.min(100, Math.round((photosSavedCount / denom) * 100))
            : 0
        const groupLines = orderedPreviewGroups.map((g) => {
          const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
          const linePct = getGroupLinePercent(
            phase,
            runningSaveTarget,
            g.groupKey,
            activeSaveJobMeta,
            photosSavedCount
          )
          return {
            key: g.groupKey,
            title: effectiveGroupTitle(g, groupTitleInputs),
            phase,
            linePct
          }
        })

        return (
          <SaveProgressCard
            title="저장 진행 중"
            prepareProgressText={
              prepareProgress
                ? `원본 읽기·해시 (현재 그룹) ${prepareProgress.completed} / ${prepareProgress.total}장`
                : null
            }
            overallPct={overallPct}
            processedCount={photosSavedCount}
            totalCount={denom}
            groupLines={groupLines}
            ariaBusy={runningSaveTarget !== null}
            onCancelRemaining={onCancelRemaining}
          />
        )
      })()
    ) : null

  return (
    <>
      {bulkOverlay}
      {singleOverlay}
    </>
  )
}
