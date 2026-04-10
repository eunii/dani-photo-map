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
  onPressBrand?: () => void
}

export function AppSidebar({
  items,
  collapsed,
  onToggleCollapsed,
  onOpenSettings,
  onPressBrand
}: AppSidebarProps) {
  return (
    <aside
      className={`app-sidebar-surface shrink-0 transition-[width] duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[228px]'
      } rounded-[18px]`}
    >
      <div className="flex h-full flex-col gap-1.5 p-1.5">
        <div
          className={`flex ${collapsed ? 'justify-center' : 'items-start justify-between'} gap-1.5 ${collapsed ? '' : 'pt-1 pl-1.5'}`}
        >
          {!collapsed ? (
            <button
              type="button"
              className="min-w-0 rounded-lg text-left outline-none transition hover:opacity-85"
              onClick={onPressBrand}
            >
              <p className="text-[19px] font-semibold leading-tight tracking-tight text-[var(--app-accent-strong)]">
                Dani Photo
              </p>
              <p className="mt-0.5 text-[14px] text-[var(--app-muted)]">
                Organizer
              </p>
            </button>
          ) : null}
          <Button
            isIconOnly
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            variant="ghost"
            className="h-9 w-9 rounded-xl border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-accent-strong)]"
            onPress={onToggleCollapsed}
          >
            {collapsed ? (
              <SidebarExpandIcon className="h-5 w-5" />
            ) : (
              <SidebarCollapseIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5" aria-label="주요 메뉴">
          {items.map((item) =>
            collapsed ? (
              <Button
                key={item.key}
                aria-label={item.label}
                variant="ghost"
                isIconOnly
                className={`h-9 w-9 self-center rounded-xl border-transparent bg-transparent transition-colors ${
                  item.isActive
                    ? 'border border-[color:color-mix(in_srgb,var(--app-accent)_42%,var(--app-border)_58%)] bg-[color:color-mix(in_srgb,var(--app-accent)_20%,var(--app-surface)_80%)] text-[var(--app-accent-strong)] shadow-[var(--app-shadow)]'
                    : 'text-[var(--app-foreground)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-sidebar-hover-text)]'
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
                className={`h-9 w-full justify-start rounded-xl border px-2 text-[13px] transition-colors ${
                  item.isActive
                    ? 'border-[color:color-mix(in_srgb,var(--app-accent)_42%,var(--app-border)_58%)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface)_82%)] font-semibold text-[var(--app-accent-strong)] shadow-[var(--app-shadow)]'
                    : 'border-transparent bg-transparent font-medium text-[var(--app-foreground)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-sidebar-hover-text)]'
                }`}
                onPress={item.onPress}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
              </Button>
            )
          )}
        </nav>

        <div className="mt-auto border-t border-[var(--app-border)] pt-1">
          <Button
            aria-label="설정 열기"
            variant="ghost"
            className={`${
              collapsed
                ? 'h-9 w-9 self-center rounded-xl border-transparent bg-transparent text-[var(--app-foreground)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-sidebar-hover-text)]'
                : 'h-9 w-full justify-start rounded-xl border-transparent px-2 text-[13px] font-medium text-[var(--app-foreground)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-sidebar-hover-text)]'
            }`}
            isIconOnly={collapsed}
            onPress={onOpenSettings}
          >
            {collapsed ? (
              <SettingsIcon className="h-5 w-5" />
            ) : (
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center">
                  <SettingsIcon className="h-[18px] w-[18px]" />
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
