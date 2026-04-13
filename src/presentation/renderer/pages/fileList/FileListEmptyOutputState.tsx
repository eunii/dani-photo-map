import { Button } from '@heroui/react'

interface FileListEmptyOutputStateProps {
  onNavigateToSettings?: () => void
}

export function FileListEmptyOutputState({
  onNavigateToSettings
}: FileListEmptyOutputStateProps) {
  return (
    <div className="flex-1 rounded-[16px] bg-[var(--app-surface)] p-5 text-center">
      <p className="text-sm font-semibold text-[var(--app-foreground)]">
        출력 폴더를 먼저 설정하세요.
      </p>
      <p className="mt-1 text-sm text-[var(--app-muted)]">
        설정 탭에서 정리 결과 폴더를 지정하면 목록이 표시됩니다.
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
