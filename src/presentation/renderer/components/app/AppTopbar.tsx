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
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-accent-strong)]">
            Workspace
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--app-foreground)] lg:text-2xl">
              {title}
            </h1>
            <p className="text-xs text-[var(--app-muted)] lg:text-sm">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]">
            {statusLabel}
          </div>
          <Button
            variant="secondary"
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[var(--app-foreground)]"
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
