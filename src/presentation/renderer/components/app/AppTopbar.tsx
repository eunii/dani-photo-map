import { Text } from '@heroui/react'

interface AppTopbarProps {
  title: string
  description: string
}

export function AppTopbar({ title, description }: AppTopbarProps) {
  const hasDescription = Boolean(description.trim())

  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-0.5 py-0.5">
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
    </div>
  )
}
