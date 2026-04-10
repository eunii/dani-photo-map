import { Badge, Button, Text } from '@heroui/react'

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
  const hasDescription = Boolean(description.trim())

  return (
    <div className="flex shrink-0 flex-col gap-1 px-0.5 py-0.5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-0.5">
        <Badge
          size="sm"
          variant="soft"
          className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--app-accent-strong)]"
        >
          Workspace
        </Badge>
        <div className="space-y-0.5">
          <h1 className="text-[20px] font-semibold leading-6 tracking-tight text-[var(--app-foreground)] lg:text-[24px] lg:leading-7">
            {title}
          </h1>
          {hasDescription ? (
            <Text
              size="sm"
              className="max-w-[52rem] text-[11px] leading-4 text-[var(--app-muted)] lg:text-[12px]"
            >
              {description}
            </Text>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        <Badge
          size="sm"
          variant="soft"
          className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-0.5 text-[10px] font-normal text-[var(--app-muted)]"
        >
          {statusLabel}
        </Badge>
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
