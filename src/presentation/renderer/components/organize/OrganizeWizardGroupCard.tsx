import type { Dispatch, SetStateAction } from 'react'

import { Button, Card, Input, TextArea } from '@heroui/react'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type { PreviewPendingOrganizationResult } from '@shared/types/preload'
import { PendingPreviewImageBlock } from '@presentation/renderer/components/organize/PendingPreviewImageBlock'
import {
  effectiveGroupTitle,
  formatMissingGpsFolderPattern,
  formatMissingGpsGroupingBasisLabel,
  getAssignmentModeDescription,
  getMissingGpsCategoryLabel,
  type GroupSavePhase
} from '@presentation/renderer/pages/organize/organizeGroupForm'

type PreviewGroup = PreviewPendingOrganizationResult['groups'][number]

export interface OrganizeSaveJobSnapshot {
  copyGroupKeysInThisRun: string[]
  isLastStep: boolean
  progressOffsetBeforeJob: number
}

interface OrganizeWizardGroupCardProps {
  group: PreviewGroup
  missingGpsGroupingBasis: MissingGpsGroupingBasis
  orderedPreviewGroups: PreviewGroup[]
  wizardStepIndex: number
  saveJobQueue: OrganizeSaveJobSnapshot[]
  runningSaveTarget: string | null
  groupSavePhaseByKey: Record<string, GroupSavePhase>
  groupTitleInputs: Record<string, string>
  setGroupTitleInputs: Dispatch<SetStateAction<Record<string, string>>>
  groupCompanionsInputs: Record<string, string>
  setGroupCompanionsInputs: Dispatch<SetStateAction<Record<string, string>>>
  groupNotesInputs: Record<string, string>
  setGroupNotesInputs: Dispatch<SetStateAction<Record<string, string>>>
  previewImageLoadFailedByPhotoId: Record<string, boolean>
  setPreviewImageLoadFailedByPhotoId: Dispatch<
    SetStateAction<Record<string, boolean>>
  >
  hasPendingPreviewGroups: boolean
  onEnqueueSaveCurrentGroup: () => void
}

export function OrganizeWizardGroupCard({
  group,
  missingGpsGroupingBasis,
  orderedPreviewGroups,
  wizardStepIndex,
  saveJobQueue,
  runningSaveTarget,
  groupSavePhaseByKey,
  groupTitleInputs,
  setGroupTitleInputs,
  groupCompanionsInputs,
  setGroupCompanionsInputs,
  groupNotesInputs,
  setGroupNotesInputs,
  previewImageLoadFailedByPhotoId,
  setPreviewImageLoadFailedByPhotoId,
  hasPendingPreviewGroups,
  onEnqueueSaveCurrentGroup
}: OrganizeWizardGroupCardProps) {
  const phaseForGroup = groupSavePhaseByKey[group.groupKey] ?? 'idle'
  const saveBusyForThisGroup =
    runningSaveTarget === group.groupKey ||
    saveJobQueue.some((job) =>
      job.copyGroupKeysInThisRun.includes(group.groupKey)
    ) ||
    phaseForGroup === 'done'
  const isLastInWizard =
    orderedPreviewGroups.length > 0 &&
    wizardStepIndex >= orderedPreviewGroups.length - 1
  const saveButtonLabel = (() => {
    switch (phaseForGroup) {
      case 'saving':
        return '저장 중…'
      case 'queued':
        return '저장 대기'
      case 'done':
        return '저장 완료'
      case 'error':
        return '다시 저장'
      default:
        break
    }

    return isLastInWizard ? '마지막 그룹 저장' : '이 그룹 저장 및 복사'
  })()

  return (
    <Card
      key={group.groupKey}
      className="app-surface-card rounded-2xl border-0 p-2.5 shadow-none"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--app-foreground)]">
              {effectiveGroupTitle(group, groupTitleInputs)}
            </h3>
            <p className="text-sm text-[var(--app-muted)]">
              사진 {group.photoCount}장
              {group.representativeGps ? ' · GPS 기반 그룹' : ' · GPS 없음'}
            </p>
            <p className="text-xs text-[var(--app-muted)]">
              현재 기준:{' '}
              {formatMissingGpsGroupingBasisLabel(missingGpsGroupingBasis)}
              {' · '}
              실제 폴더: {formatMissingGpsFolderPattern(missingGpsGroupingBasis)}
            </p>
            <div className="flex flex-wrap gap-2">
              {getMissingGpsCategoryLabel(group.missingGpsCategory) ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {getMissingGpsCategoryLabel(group.missingGpsCategory)}
                </span>
              ) : null}
            </div>
            {getAssignmentModeDescription(group) ? (
              <p className="text-xs text-[var(--app-muted)]">
                {getAssignmentModeDescription(group)}
              </p>
            ) : null}
          </div>
          <div className="rounded-full bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-accent-strong)]">
            {group.groupKey}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:gap-2">
          {group.representativePhotos.map((photo) => (
            <div key={photo.id} className="min-w-0">
              <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <PendingPreviewImageBlock
                  photo={photo}
                  imageFailed={Boolean(previewImageLoadFailedByPhotoId[photo.id])}
                  onImageError={() =>
                    setPreviewImageLoadFailedByPhotoId((current) => ({
                      ...current,
                      [photo.id]: true
                    }))
                  }
                  imageHeightClass="h-14"
                  placeholderClassName="flex h-14 items-center justify-center bg-slate-200 px-1 text-center text-[10px] leading-tight text-slate-500"
                  imageAlt={photo.sourceFileName}
                />
              </div>
              <p
                className="mt-0.5 truncate text-[10px] font-medium text-slate-800"
                title={photo.sourceFileName}
              >
                {photo.sourceFileName}
              </p>
              <p
                className="truncate text-[10px] text-slate-500"
                title={photo.capturedAtIso ?? '촬영 시각 없음'}
              >
                {photo.capturedAtIso ?? '촬영 시각 없음'}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-1 rounded-2xl border border-[var(--app-border)] bg-[color:color-mix(in_srgb,var(--app-surface-strong)_88%,var(--app-surface)_12%)] p-4 shadow-[0_1px_0_0_color-mix(in_srgb,var(--app-border)_65%,transparent)]">
          <div className="space-y-3">
            {group.suggestedTitles.length > 0 ? (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                    기본 그룹명 제안
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.suggestedTitles.map((title) => (
                      <button
                        key={title}
                        type="button"
                        className="rounded-full border border-[color:color-mix(in_srgb,var(--app-accent)_35%,var(--app-border)_65%)] bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)] px-3 py-1.5 text-xs font-medium text-[var(--app-accent-strong)] transition hover:bg-[color:color-mix(in_srgb,var(--app-accent)_14%,var(--app-surface)_86%)]"
                        onClick={() =>
                          setGroupTitleInputs((current) => ({
                            ...current,
                            [group.groupKey]: title
                          }))
                        }
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-[color:color-mix(in_srgb,var(--app-border)_75%,transparent_25%)]" />
              </>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--app-foreground)]">
                    저장될 그룹명
                  </span>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    인덱스·지도에 표시
                  </span>
                </div>
                <Input
                  value={groupTitleInputs[group.groupKey] ?? ''}
                  onChange={(event) =>
                    setGroupTitleInputs((current) => ({
                      ...current,
                      [group.groupKey]: event.target.value
                    }))
                  }
                  placeholder={group.displayTitle}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--app-foreground)_4%,transparent)] placeholder:text-[var(--app-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--app-accent)_40%,transparent)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--app-foreground)]">
                    동행인
                  </span>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    쉼표로 구분
                  </span>
                </div>
                <Input
                  value={groupCompanionsInputs[group.groupKey] ?? ''}
                  onChange={(event) =>
                    setGroupCompanionsInputs((current) => ({
                      ...current,
                      [group.groupKey]: event.target.value
                    }))
                  }
                  placeholder="예: Alice, Bob"
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--app-foreground)_4%,transparent)] placeholder:text-[var(--app-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--app-accent)_40%,transparent)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--app-foreground)]">
                    메모
                  </span>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    선택 · 그룹 상세에 표시
                  </span>
                </div>
                <TextArea
                  value={groupNotesInputs[group.groupKey] ?? ''}
                  onChange={(event) =>
                    setGroupNotesInputs((current) => ({
                      ...current,
                      [group.groupKey]: event.target.value
                    }))
                  }
                  placeholder="여행 메모, 장소, 분위기 등을 적어 두세요."
                  className="min-h-[5.75rem] w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--app-foreground)] shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--app-foreground)_4%,transparent)] placeholder:text-[var(--app-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--app-accent)_40%,transparent)]"
                />
              </div>
            </div>
          </div>
        </div>

        {hasPendingPreviewGroups ? (
          <div className="flex justify-end border-t border-[var(--app-border)] pt-4">
            <Button
              variant="primary"
              className="rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
              isDisabled={saveBusyForThisGroup}
              onPress={onEnqueueSaveCurrentGroup}
            >
              {saveButtonLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
