import { Button } from '@heroui/react'

interface OrganizeOutputMissingCardProps {
  onNavigateToSettings?: () => void
}

export function OrganizeOutputMissingCard({
  onNavigateToSettings
}: OrganizeOutputMissingCardProps) {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--app-foreground)]">
            출력 폴더가 설정되지 않았습니다.
          </h2>
          <p className="text-sm text-[var(--app-muted)]">
            공통 출력 폴더는 설정 탭에서 지정합니다.
          </p>
        </div>
        {onNavigateToSettings ? (
          <Button
            variant="secondary"
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
            onPress={onNavigateToSettings}
          >
            설정으로 이동
          </Button>
        ) : null}
      </div>
    </section>
  )
}
