import type { ReactNode } from 'react'

import { Button } from '@heroui/react'

import {
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SettingsIcon
} from '@presentation/renderer/components/app/AppIcons'

interface AppSidebarItem {
  key: string
  label: string
  icon: ReactNode
  isActive: boolean
  onPress: () => void
}

interface AppSidebarProps {
  items: AppSidebarItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenSettings: () => void
}

export function AppSidebar({
  items,
  collapsed,
  onToggleCollapsed,
  onOpenSettings
}: AppSidebarProps) {
  return (
    <aside
      className={`app-sidebar-surface shrink-0 transition-[width] duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[228px]'
      } rounded-[18px]`}
    >
      <div className="flex h-full min-h-[calc(100vh-0.5rem)] flex-col gap-2.5 p-2.5">
        <div
          className={`flex ${collapsed ? 'justify-center' : 'items-start justify-between'} gap-2 px-1`}
        >
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-accent-strong)]">
                Dani Photo Map
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
                organizer
              </p>
            </div>
          ) : null}
          <Button
            isIconOnly
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            variant="ghost"
            className="h-8 w-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
            onPress={onToggleCollapsed}
          >
            {collapsed ? (
              <SidebarExpandIcon className="h-4 w-4" />
            ) : (
              <SidebarCollapseIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5" aria-label="주요 메뉴">
          {items.map((item) =>
            collapsed ? (
              <Button
                key={item.key}
                aria-label={item.label}
                variant="ghost"
                isIconOnly
                className={`h-10 w-10 self-center rounded-lg border text-[var(--app-foreground)] ${
                  item.isActive
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                    : 'border-transparent bg-transparent hover:bg-[var(--theme-danger)] hover:text-[var(--app-sidebar-hover-text)]'
                }`}
                onPress={item.onPress}
              >
                {item.icon}
              </Button>
            ) : (
              <Button
                key={item.key}
                aria-label={item.label}
                variant="ghost"
                className={`h-11 justify-start rounded-lg px-[18px] text-[15px] font-medium ${
                  item.isActive
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                    : 'bg-transparent text-[var(--app-foreground)] hover:bg-[var(--theme-danger)] hover:text-[var(--app-sidebar-hover-text)]'
                }`}
                onPress={item.onPress}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
              </Button>
            )
          )}
        </nav>

        <div className="mt-auto border-t border-[var(--app-border)] pt-2">
          <Button
            aria-label="설정 열기"
            variant="ghost"
            className={`${
              collapsed
                ? 'h-10 w-10 self-center rounded-lg border border-transparent bg-transparent text-[var(--app-foreground)] hover:bg-[var(--theme-danger)] hover:text-[var(--app-sidebar-hover-text)]'
                : 'h-11 w-full justify-start rounded-lg px-[18px] text-[15px] font-medium text-[var(--app-foreground)] hover:bg-[var(--theme-danger)] hover:text-[var(--app-sidebar-hover-text)]'
            }`}
            isIconOnly={collapsed}
            onPress={onOpenSettings}
          >
            {collapsed ? (
              <SettingsIcon className="h-4 w-4" />
            ) : (
              <span className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center">
                  <SettingsIcon className="h-4 w-4" />
                </span>
                <span>설정</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  )
}
