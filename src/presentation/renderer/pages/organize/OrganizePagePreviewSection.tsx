import type {
  PendingOrganizationPreviewGroup,
  PreviewPendingOrganizationResult
} from '@shared/types/preload'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import { OrganizeWizardGroupCard } from '@presentation/renderer/components/organize/OrganizeWizardGroupCard'
import {
  type GroupSavePhase,
  effectiveGroupTitle,
  formatGroupSavePhaseLabel
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import type { OrganizeSaveJob } from '@presentation/renderer/pages/organize/useOrganizeSaveJobs'
import type { Dispatch, SetStateAction } from 'react'

interface OrganizePagePreviewSectionProps {
  previewResult: PreviewPendingOrganizationResult
  hidePreviewPanelWhileSaving: boolean
  hasPendingPreviewGroups: boolean
  orderedPreviewGroups: PendingOrganizationPreviewGroup[]
  wizardStepIndex: number
  wizardGroup: PendingOrganizationPreviewGroup | undefined
  totalPhotosInPreview: number
  photosSavedCount: number
  groupSavePhaseByKey: Record<string, GroupSavePhase>
  runningSaveTarget: string | null
  saveJobQueue: OrganizeSaveJob[]
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
  missingGpsGroupingBasis: MissingGpsGroupingBasis
  onEnqueueSaveCurrentGroup: () => void
}

export function OrganizePagePreviewSection({
  previewResult,
  hidePreviewPanelWhileSaving,
  hasPendingPreviewGroups,
  orderedPreviewGroups,
  wizardStepIndex,
  wizardGroup,
  totalPhotosInPreview,
  photosSavedCount,
  groupSavePhaseByKey,
  runningSaveTarget,
  saveJobQueue,
  groupTitleInputs,
  setGroupTitleInputs,
  groupCompanionsInputs,
  setGroupCompanionsInputs,
  groupNotesInputs,
  setGroupNotesInputs,
  previewImageLoadFailedByPhotoId,
  setPreviewImageLoadFailedByPhotoId,
  missingGpsGroupingBasis,
  onEnqueueSaveCurrentGroup
}: OrganizePagePreviewSectionProps) {
  if (hidePreviewPanelWhileSaving) {
    return null
  }

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
      <section className="rounded-xl border border-[color:color-mix(in_srgb,var(--app-accent)_32%,var(--app-border)_68%)] bg-[color:color-mix(in_srgb,var(--app-accent)_6%,var(--app-surface)_94%)] p-2.5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-[var(--app-foreground)]">
                신규 정리 대상 {previewResult.pendingPhotoCount}장, 기존 중복 스킵
                예정 {previewResult.skippedExistingCount}장
              </p>
              {previewResult.skippedUnchangedCount > 0 ? (
                <p className="text-[11px] text-[var(--app-muted)]">
                  증분 재스캔 기준으로 변경 없는 입력{' '}
                  {previewResult.skippedUnchangedCount}장은 준비 단계에서
                  건너뛰었습니다.
                </p>
              ) : null}
              {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
                <p className="text-[11px] font-medium text-[var(--app-accent-strong)]">
                  그룹 {wizardStepIndex + 1} / {orderedPreviewGroups.length} — GPS
                  있는 그룹을 먼저, GPS 없는 그룹은 마지막에 저장합니다.
                </p>
              ) : null}
            </div>
            <div className="shrink-0 rounded-full bg-[var(--app-accent)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--app-accent-foreground)]">
              스캔 후보 {previewResult.scannedCount}장
            </div>
          </div>

          {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2">
              <ul className="space-y-1">
                {orderedPreviewGroups.map((g) => {
                  const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
                  const isCurrentRun = runningSaveTarget === g.groupKey
                  const titleLabel = effectiveGroupTitle(g, groupTitleInputs)
                  return (
                    <li
                      key={g.groupKey}
                      className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                        phase === 'saving' || isCurrentRun
                          ? 'font-medium text-[var(--app-accent-strong)]'
                          : 'text-[var(--app-foreground)]'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate" title={titleLabel}>
                        {titleLabel}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 ${
                          phase === 'saving' || isCurrentRun
                            ? 'bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface)_82%)] text-[var(--app-accent-strong)]'
                            : phase === 'done'
                              ? 'bg-[color:color-mix(in_srgb,var(--app-accent)_22%,var(--app-surface)_78%)] text-[var(--app-accent-strong)]'
                              : phase === 'error'
                                ? 'bg-[color:color-mix(in_srgb,var(--app-danger)_26%,var(--app-surface)_74%)] text-[var(--app-danger-foreground)]'
                                : phase === 'queued'
                                  ? 'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]'
                                  : 'bg-[color:color-mix(in_srgb,var(--app-border)_20%,var(--app-surface)_80%)] text-[var(--app-muted)]'
                        }`}
                      >
                        {formatGroupSavePhaseLabel(phase)}
                        {phase === 'saving' ? '…' : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {totalPhotosInPreview > 0 ? (
                <p className="mt-1.5 text-[10px] text-[var(--app-muted)]">
                  사진{' '}
                  <span className="font-medium text-[var(--app-accent-strong)]">
                    {photosSavedCount}
                  </span>{' '}
                  / {totalPhotosInPreview}장
                  {` (${Math.min(
                    100,
                    Math.round((photosSavedCount / totalPhotosInPreview) * 100)
                  )}%)`}
                </p>
              ) : null}
            </div>
          ) : null}

          {hasPendingPreviewGroups && wizardGroup ? (
            <div className="space-y-2">
              <OrganizeWizardGroupCard
                group={wizardGroup}
                missingGpsGroupingBasis={missingGpsGroupingBasis}
                orderedPreviewGroups={orderedPreviewGroups}
                wizardStepIndex={wizardStepIndex}
                saveJobQueue={saveJobQueue}
                runningSaveTarget={runningSaveTarget}
                groupSavePhaseByKey={groupSavePhaseByKey}
                groupTitleInputs={groupTitleInputs}
                setGroupTitleInputs={setGroupTitleInputs}
                groupCompanionsInputs={groupCompanionsInputs}
                setGroupCompanionsInputs={setGroupCompanionsInputs}
                groupNotesInputs={groupNotesInputs}
                setGroupNotesInputs={setGroupNotesInputs}
                previewImageLoadFailedByPhotoId={previewImageLoadFailedByPhotoId}
                setPreviewImageLoadFailedByPhotoId={
                  setPreviewImageLoadFailedByPhotoId
                }
                hasPendingPreviewGroups={hasPendingPreviewGroups}
                onEnqueueSaveCurrentGroup={onEnqueueSaveCurrentGroup}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center">
              <p className="text-sm font-semibold text-[var(--app-foreground)]">
                새로 정리할 파일이 없습니다.
              </p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                현재 원본 폴더의 파일은 출력 폴더에 이미 있거나 중복으로
                판단되었습니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
