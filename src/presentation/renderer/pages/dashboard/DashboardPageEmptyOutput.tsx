import { Button, Card } from '@heroui/react'

interface DashboardPageEmptyOutputProps {
  onNavigateToSettings?: () => void
}

export function DashboardPageEmptyOutput({
  onNavigateToSettings
}: DashboardPageEmptyOutputProps) {
  return (
    <Card className="app-surface-card flex h-full min-h-0 flex-col items-center justify-center rounded-[20px] border-0 px-6 py-8 text-center shadow-none">
      <Card.Header className="flex flex-col items-center p-0">
        <Card.Title className="text-base font-semibold text-[var(--app-foreground)]">
          출력 폴더를 먼저 설정하세요.
        </Card.Title>
        <Card.Description className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
          메인 대시보드는 정리된 라이브러리의 폴더 구조와 대표 썸네일을 요약해서 보여줍니다.
          설정에서 출력 폴더를 지정하면 바로 사용할 수 있습니다.
        </Card.Description>
      </Card.Header>
      {onNavigateToSettings ? (
        <Card.Footer className="mt-4 p-0">
          <Button
            variant="primary"
            className="rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
            onPress={onNavigateToSettings}
          >
            설정으로 이동
          </Button>
        </Card.Footer>
      ) : null}
    </Card>
  )
}
