import type { ReactNode } from 'react'

import { Button, Card } from '@heroui/react'

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
    <Card
      className={`app-sidebar-surface shrink-0 border-0 shadow-none transition-[width] duration-200 ${
        collapsed ? 'w-[88px]' : 'w-[272px]'
      }`}
    >
      <div className="flex h-full min-h-[calc(100vh-2rem)] flex-col gap-5 p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--app-accent-strong)]">
              {collapsed ? 'DPM' : 'Dani Photo Map'}
            </p>
            {!collapsed ? (
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                사진 정리와 지도 탐색
              </p>
            ) : null}
          </div>
          <Button
            isIconOnly
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            variant="ghost"
            className="border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
            onPress={onToggleCollapsed}
          >
            {collapsed ? (
              <SidebarExpandIcon className="h-4 w-4" />
            ) : (
              <SidebarCollapseIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-2" aria-label="주요 메뉴">
          {items.map((item) => (
            <Button
              key={item.key}
              aria-label={item.label}
              variant={item.isActive ? 'primary' : 'ghost'}
              className={`h-12 justify-start rounded-2xl px-3 text-sm ${
                item.isActive
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                  : 'bg-transparent text-[var(--app-foreground)] hover:bg-[var(--app-surface-strong)]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              isIconOnly={collapsed}
              onPress={item.onPress}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/5">
                  {item.icon}
                </span>
                {!collapsed ? <span>{item.label}</span> : null}
              </span>
            </Button>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--app-border)] pt-3">
          <Button
            aria-label="설정 열기"
            variant="secondary"
            className={`h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)] ${
              collapsed ? 'justify-center px-0' : 'justify-start px-3'
            }`}
            isIconOnly={collapsed}
            onPress={onOpenSettings}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--app-surface-strong)]">
                <SettingsIcon className="h-4 w-4" />
              </span>
              {!collapsed ? <span>설정</span> : null}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
