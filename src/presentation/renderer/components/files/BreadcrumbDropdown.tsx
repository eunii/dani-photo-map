import { Dropdown } from '@heroui/react'

export interface BreadcrumbDropdownOption {
  key: string
  label: string
  pathSegments: string[]
  photoCount?: number
}

interface BreadcrumbDropdownProps {
  label: string
  currentPathSegments: string[]
  options: BreadcrumbDropdownOption[]
  onNavigate: (segments: string[]) => void
}

const CURRENT_KEY = '__current__'

export function BreadcrumbDropdown({
  label,
  currentPathSegments,
  options,
  onNavigate
}: BreadcrumbDropdownProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button
          type="button"
          className="min-w-0 truncate rounded-md text-left text-sm font-medium text-[var(--app-foreground)] transition-colors hover:text-[var(--app-accent-strong)]"
        >
          <span className="truncate">{label}</span>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover
        placement="bottom start"
        className="min-w-[240px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1"
      >
        <Dropdown.Menu
          aria-label={`${label} 하위 폴더`}
          onAction={(key) => {
            if (key === CURRENT_KEY) {
              onNavigate(currentPathSegments)
              return
            }

            const target = options.find((option) => option.key === String(key))

            if (target) {
              onNavigate(target.pathSegments)
            }
          }}
        >
          <Dropdown.Section>
            <Dropdown.Item
              id={CURRENT_KEY}
              textValue={`${label} 보기`}
              className="rounded-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--app-foreground)]">
                    {label}
                  </p>
                  <p className="text-xs text-[var(--app-muted)]">
                    현재 단계로 이동
                  </p>
                </div>
              </div>
            </Dropdown.Item>
          </Dropdown.Section>
          <Dropdown.Section>
            {options.length === 0 ? (
              <Dropdown.Item
                id="__empty__"
                textValue="하위 폴더 없음"
                className="rounded-xl"
              >
                <div className="py-1 text-sm text-[var(--app-muted)]">
                  하위 폴더가 없습니다.
                </div>
              </Dropdown.Item>
            ) : (
              options.map((option) => (
                <Dropdown.Item
                  key={option.key}
                  id={option.key}
                  textValue={option.label}
                  className="rounded-xl"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-[var(--app-foreground)]">
                      {option.label}
                    </span>
                    {typeof option.photoCount === 'number' ? (
                      <span className="text-xs text-[var(--app-muted)]">
                        {option.photoCount}장
                      </span>
                    ) : null}
                  </div>
                </Dropdown.Item>
              ))
            )}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
