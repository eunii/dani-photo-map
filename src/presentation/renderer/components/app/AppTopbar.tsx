import { Button } from '@heroui/react'

import { SettingsIcon } from '@presentation/renderer/components/app/AppIcons'

interface AppTopbarProps {
  title: string
  description: string
  statusLabel: string
  onOpenSettings: () => void
}

export function AppTopbar({
  title,
  description,
  statusLabel,
  onOpenSettings
}: AppTopbarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-1 px-0.5 py-0.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-0.5">
        <div className="inline-flex items-center rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--app-accent-strong)]">
          Workspace
        </div>
        <div className="space-y-0.5">
          <h1 className="text-[20px] font-semibold leading-6 tracking-tight text-[var(--app-foreground)] lg:text-[24px] lg:leading-7">
            {title}
          </h1>
          <p className="max-w-[52rem] text-[11px] leading-4 text-[var(--app-muted)] lg:text-[12px]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-0.5 text-[10px] text-[var(--app-muted)]">
          {statusLabel}
        </div>
        <Button
          variant="secondary"
          className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[12px] text-[var(--app-foreground)]"
          onPress={onOpenSettings}
        >
          <span className="inline-flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            설정
          </span>
        </Button>
      </div>
    </div>
  )
}
