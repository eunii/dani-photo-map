import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
  FilesIcon,
  MapIcon,
  OrganizeIcon
} from '@presentation/renderer/components/app/AppIcons'
import { AppSidebar } from '@presentation/renderer/components/app/AppSidebar'
import { AppTopbar } from '@presentation/renderer/components/app/AppTopbar'
import { SettingsDrawer } from '@presentation/renderer/components/settings/SettingsDrawer'
import { BrowsePage } from '@presentation/renderer/pages/BrowsePage'
import { FileListPage } from '@presentation/renderer/pages/FileListPage'
import { OrganizePage } from '@presentation/renderer/pages/OrganizePage'
import { SettingsPage } from '@presentation/renderer/pages/SettingsPage'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'
import { useUiPreferencesStore } from '@presentation/renderer/store/useUiPreferencesStore'

type AppRoute = 'organize' | 'files' | 'browse'
type HashRoute = AppRoute | 'settings'

const ROUTE_HASHES: Record<AppRoute, string> = {
  organize: '#/organize',
  files: '#/files',
  browse: '#/browse'
}

const SETTINGS_HASH = '#/settings'

const ROUTE_META: Record<
  AppRoute,
  { title: string; description: string; statusLabel: string }
> = {
  organize: {
    title: '사진 정리',
    description: '원본 폴더를 스캔하고 출력 규칙에 맞춰 결과를 준비합니다.',
    statusLabel: '정리 워크플로'
  },
  files: {
    title: '파일 목록',
    description: '출력 폴더 구조와 사진 목록을 경로 단위로 탐색합니다.',
    statusLabel: '폴더 탐색'
  },
  browse: {
    title: '지도 탐색',
    description: '대표 사진과 그룹 메타데이터를 지도로 빠르게 살펴봅니다.',
    statusLabel: 'Map Explorer'
  }
}

function getFallbackRoute(outputRoot: string): AppRoute {
  return outputRoot ? 'browse' : 'organize'
}

function getRouteFromHash(hash: string): HashRoute | undefined {
  if (hash === ROUTE_HASHES.files) {
    return 'files'
  }
  if (hash === ROUTE_HASHES.browse) {
    return 'browse'
  }
  if (hash === SETTINGS_HASH) {
    return 'settings'
  }
  if (hash === ROUTE_HASHES.organize) {
    return 'organize'
  }
  return undefined
}

function getInitialRoute(hash: string, outputRoot: string): AppRoute {
  const parsed = getRouteFromHash(hash)

  if (parsed && parsed !== 'settings') {
    return parsed
  }

  return getFallbackRoute(outputRoot)
}

export function App() {
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const themeId = useUiPreferencesStore((state) => state.themeId)
  const sidebarCollapsed = useUiPreferencesStore(
    (state) => state.sidebarCollapsed
  )
  const toggleSidebarCollapsed = useUiPreferencesStore(
    (state) => state.toggleSidebarCollapsed
  )
  const [route, setRoute] = useState<AppRoute>(() =>
    getInitialRoute(window.location.hash, outputRoot)
  )
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    const initialHashRoute = getRouteFromHash(window.location.hash)
    return initialHashRoute === 'settings' || !outputRoot
  })

  useEffect(() => {
    document.documentElement.dataset.theme = themeId
  }, [themeId])

  useEffect(() => {
    if (!outputRoot) {
      setIsSettingsOpen(true)
    }
  }, [outputRoot])

  useEffect(() => {
    const handleHashChange = () => {
      const nextHashRoute = getRouteFromHash(window.location.hash)

      if (nextHashRoute === 'settings') {
        setIsSettingsOpen(true)
        return
      }

      if (!nextHashRoute) {
        const fallbackRoute = getFallbackRoute(outputRoot)
        setRoute(fallbackRoute)
        return
      }

      setRoute(nextHashRoute)
      setIsSettingsOpen(false)
    }

    window.addEventListener('hashchange', handleHashChange)

    if (!window.location.hash) {
      window.location.hash = ROUTE_HASHES[getFallbackRoute(outputRoot)]
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [outputRoot])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  const routeMeta = useMemo(() => ROUTE_META[route], [route])

  function navigate(nextRoute: AppRoute): void {
    const nextHash = ROUTE_HASHES[nextRoute]
    setRoute(nextRoute)
    setIsSettingsOpen(false)

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
      return
    }

    setRoute(nextRoute)
  }

  function openSettings(): void {
    setIsSettingsOpen(true)
  }

  function closeSettings(): void {
    setIsSettingsOpen(false)

    if (window.location.hash === SETTINGS_HASH) {
      window.location.hash = ROUTE_HASHES[route]
    }
  }

  const navigationItems: Array<{
    route: AppRoute
    label: string
    icon: ReactNode
  }> = [
    { route: 'organize', label: '정리', icon: <OrganizeIcon className="h-4 w-4" /> },
    { route: 'files', label: '파일 목록', icon: <FilesIcon className="h-4 w-4" /> },
    { route: 'browse', label: '지도', icon: <MapIcon className="h-4 w-4" /> }
  ]

  return (
    <main className="min-h-screen px-2 py-2 lg:px-3 lg:py-3">
      <section className="mx-auto flex min-h-[calc(100vh-0.5rem)] w-full max-w-[min(99vw,1700px)] gap-3 lg:min-h-[calc(100vh-0.75rem)]">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          onOpenSettings={openSettings}
          items={navigationItems.map((item) => ({
            key: item.route,
            label: item.label,
            icon: item.icon,
            isActive: route === item.route,
            onPress: () => navigate(item.route)
          }))}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <AppTopbar
            title={routeMeta.title}
            description={routeMeta.description}
            statusLabel={routeMeta.statusLabel}
            onOpenSettings={openSettings}
          />

          <section className="app-page-section min-h-0 flex-1 rounded-[18px] p-1 lg:p-2">
            {route === 'organize' ? (
              <OrganizePage
                onNavigateToBrowse={() => navigate('browse')}
                onNavigateToSettings={openSettings}
              />
            ) : route === 'files' ? (
              <FileListPage onNavigateToSettings={openSettings} />
            ) : route === 'browse' ? (
              <BrowsePage onNavigateToSettings={openSettings} />
            ) : (
              <SettingsPage />
            )}
          </section>

          <footer className="px-1 py-1">
            <p className="text-xs text-[var(--app-muted)]">
              원본은 수정하지 않고, 정리 결과는 출력 폴더와
              `.photo-organizer/index.json`에 저장됩니다.
            </p>
          </footer>
        </div>

        <SettingsDrawer
          isOpen={isSettingsOpen}
          onOpenChange={(next) => {
            if (next) {
              openSettings()
              return
            }

            closeSettings()
          }}
        />
      </section>
    </main>
  )
}
