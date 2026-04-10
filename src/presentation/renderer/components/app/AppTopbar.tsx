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
    <div className="flex flex-col gap-1.5 px-1 py-1 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-0.5">
        <div className="inline-flex items-center rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--app-accent-strong)]">
          Workspace
        </div>
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--app-foreground)] lg:text-[26px] lg:leading-8">
            {title}
          </h1>
          <p className="max-w-[52rem] text-[12px] leading-5 text-[var(--app-muted)] lg:text-[13px]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[10px] text-[var(--app-muted)]">
          {statusLabel}
        </div>
        <Button
          variant="secondary"
          className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-foreground)]"
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
