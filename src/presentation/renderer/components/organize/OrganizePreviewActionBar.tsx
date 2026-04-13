import { Button } from '@heroui/react'

interface OrganizePreviewActionBarProps {
  previewResult: unknown | null
  hasPendingPreviewGroups: boolean
  orderedPreviewGroupCount: number
  wizardStepIndex: number
  isLoadingPreview: boolean
  savePipelineBusy: boolean
  onWizardPrev: () => void
  onReloadPreview: () => void
  onSaveAllGroups: () => void
}

export function OrganizePreviewActionBar({
  previewResult,
  hasPendingPreviewGroups,
  orderedPreviewGroupCount,
  wizardStepIndex,
  isLoadingPreview,
  savePipelineBusy,
  onWizardPrev,
  onReloadPreview,
  onSaveAllGroups
}: OrganizePreviewActionBarProps) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {previewResult ? (
            <>
              {hasPendingPreviewGroups && orderedPreviewGroupCount > 1 ? (
                <Button
                  variant="secondary"
                  className="h-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[12px] text-[var(--app-foreground)]"
                  isDisabled={savePipelineBusy || wizardStepIndex === 0}
                  onPress={onWizardPrev}
                >
                  이전 그룹
                </Button>
              ) : null}
              <Button
                variant="secondary"
                className="h-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[12px] text-[var(--app-foreground)]"
                isDisabled={isLoadingPreview || savePipelineBusy}
                onPress={onReloadPreview}
              >
                후보 다시 불러오기
              </Button>
              {hasPendingPreviewGroups && orderedPreviewGroupCount > 0 ? (
                <Button
                  variant="primary"
                  className="h-8 rounded-xl bg-[var(--app-accent)] px-2.5 text-[12px] text-[var(--app-accent-foreground)]"
                  isDisabled={
                    isLoadingPreview ||
                    savePipelineBusy ||
                    orderedPreviewGroupCount === 0
                  }
                  onPress={onSaveAllGroups}
                >
                  이후 그룹 전체 저장하기
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-[10px] leading-snug text-[var(--app-muted)]">
              위에서 원본을 고르고 「정리 시작하기」로 후보를 만듭니다. 출력
              폴더는 설정에서 지정합니다.
            </p>
          )}
        </div>
        {previewResult ? (
          <p className="text-[10px] leading-snug text-[var(--app-muted)]">
            그룹 메타 입력 후 카드에서 저장하거나 일괄 저장으로 이어서 처리합니다.
            GPS 유무와 관계없이 같은 기준으로 그룹을 나눕니다.
          </p>
        ) : null}
      </div>
    </div>
  )
}
