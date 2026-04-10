import { Button, Card } from '@heroui/react'

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
    <Card className="app-surface-card border-0 shadow-none">
      <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent-strong)]">
            Workspace
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-foreground)] lg:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-[var(--app-muted)]">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs text-[var(--app-muted)]">
            {statusLabel}
          </div>
          <Button
            variant="secondary"
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
            onPress={onOpenSettings}
          >
            <span className="inline-flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              설정
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
