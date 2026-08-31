import { Text } from '@heroui/react'

interface AppTopbarProps {
  title: string
  description: string
  organizeJobBadgeText?: string
  onOrganizeJobBadgeClick?: () => void
}

export function AppTopbar({
  title,
  description,
  organizeJobBadgeText,
  onOrganizeJobBadgeClick
}: AppTopbarProps) {
  const hasDescription = Boolean(description.trim())

  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-0.5 py-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
        <h1 className="text-[18px] font-semibold leading-5 tracking-tight text-[var(--app-foreground)] lg:text-[22px] lg:leading-6">
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
        {organizeJobBadgeText ? (
          <button
            type="button"
            onClick={onOrganizeJobBadgeClick}
            disabled={!onOrganizeJobBadgeClick}
            className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-accent-strong)] transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
          >
            {organizeJobBadgeText}
          </button>
        ) : null}
      </div>
    </div>
  )
}
