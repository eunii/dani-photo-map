import { Button } from '@heroui/react'

interface BrowsePageEmptyOutputProps {
  onNavigateToSettings?: () => void
}

export function BrowsePageEmptyOutput({
  onNavigateToSettings
}: BrowsePageEmptyOutputProps) {
  return (
    <div className="rounded-[18px] bg-[var(--app-surface)] p-6 text-center">
      <p className="text-base font-semibold text-[var(--app-foreground)]">
        출력 폴더를 먼저 설정하세요.
      </p>
      <p className="mt-2 text-sm text-[var(--app-muted)]">
        설정 탭에서 정리 결과 폴더를 지정하면 바로 탐색할 수 있습니다.
      </p>
      {onNavigateToSettings ? (
        <Button
          variant="primary"
          className="mt-3 rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
          onPress={onNavigateToSettings}
        >
          설정으로 이동
        </Button>
      ) : null}
    </div>
  )
}
