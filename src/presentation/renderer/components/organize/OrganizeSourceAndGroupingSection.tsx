import { Button } from '@heroui/react'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import { MISSING_GPS_GROUPING_OPTIONS } from '@presentation/renderer/pages/organize/organizePageConstants'

interface OrganizeSourceAndGroupingSectionProps {
  sourceRoot: string | null
  previewResult: unknown | null
  isLoadingPreview: boolean
  savePipelineBusy: boolean
  missingGpsGroupingBasis: MissingGpsGroupingBasis
  onSelectSource: () => void
  onStartPreview: () => void
  onChangeGroupingBasis: (next: MissingGpsGroupingBasis) => void
}

export function OrganizeSourceAndGroupingSection({
  sourceRoot,
  previewResult,
  isLoadingPreview,
  savePipelineBusy,
  missingGpsGroupingBasis,
  onSelectSource,
  onStartPreview,
  onChangeGroupingBasis
}: OrganizeSourceAndGroupingSectionProps) {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-2">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-sm font-semibold text-[var(--app-foreground)]">
            원본 사진 폴더
          </span>
          <div
            className={`min-h-8 min-w-0 flex-1 truncate rounded-xl px-2 py-1.5 text-[12px] leading-snug ${
              sourceRoot
                ? 'border border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_10%,var(--app-surface)_90%)] text-[var(--app-foreground)]'
                : 'border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]'
            }`}
            title={sourceRoot || undefined}
          >
            {sourceRoot || '아직 선택되지 않았습니다.'}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              variant="secondary"
              className="h-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 text-[12px] font-medium text-[var(--app-foreground)] hover:bg-[color:color-mix(in_srgb,var(--app-foreground)_6%,var(--app-surface-strong)_94%)]"
              onPress={onSelectSource}
            >
              원본 폴더 선택
            </Button>
            {!previewResult ? (
              <Button
                variant="secondary"
                className="h-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[12px] font-semibold text-[var(--app-foreground)] shadow-sm hover:border-[var(--app-foreground)]/20 hover:bg-[var(--app-surface-strong)]"
                isDisabled={isLoadingPreview}
                onPress={onStartPreview}
              >
                {isLoadingPreview ? '불러오는 중…' : '정리 시작하기'}
              </Button>
            ) : null}
          </div>
        </div>

        <div
          className="border-t border-[var(--app-border)] pt-2"
          title="아래 기준으로 GPS 유무와 관계없이 그룹을 나누고 폴더를 구성합니다."
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <p className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--app-muted)]">
              그룹 기준 (GPS 포함)
            </p>
            <div className="flex min-w-0 flex-wrap gap-1">
              {MISSING_GPS_GROUPING_OPTIONS.map((option) => {
                const isSelected = missingGpsGroupingBasis === option.value

                return (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    className={`h-7 min-w-0 rounded-full px-2.5 text-[11px] ${
                      isSelected
                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                        : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]'
                    }`}
                    isDisabled={isLoadingPreview || savePipelineBusy}
                    onPress={() => {
                      if (option.value === missingGpsGroupingBasis) {
                        return
                      }
                      onChangeGroupingBasis(option.value)
                    }}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
