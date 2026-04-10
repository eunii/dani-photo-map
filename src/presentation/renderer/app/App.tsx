import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
  DashboardIcon,
  FilesIcon,
  MapIcon,
  OrganizeIcon
} from '@presentation/renderer/components/app/AppIcons'
import { AppSidebar } from '@presentation/renderer/components/app/AppSidebar'
import { AppTopbar } from '@presentation/renderer/components/app/AppTopbar'
import { SettingsDrawer } from '@presentation/renderer/components/settings/SettingsDrawer'
import { BrowsePage } from '@presentation/renderer/pages/BrowsePage'
import { DashboardPage } from '@presentation/renderer/pages/DashboardPage'
import { FileListPage } from '@presentation/renderer/pages/FileListPage'
import { OrganizePage } from '@presentation/renderer/pages/OrganizePage'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'
import { useUiPreferencesStore } from '@presentation/renderer/store/useUiPreferencesStore'

type AppRoute = 'dashboard' | 'organize' | 'files' | 'browse'
type HashRoute = AppRoute | 'settings'

const ROUTE_HASHES: Record<AppRoute, string> = {
  dashboard: '#/dashboard',
  organize: '#/organize',
  files: '#/files',
  browse: '#/browse'
}

const SETTINGS_HASH = '#/settings'

const ROUTE_META: Record<
  AppRoute,
  { title: string; description: string; statusLabel: string }
> = {
  dashboard: {
    title: '메인 대시보드',
    description:
      '정리된 라이브러리의 전체 폴더 경로를 검색하고 원하는 폴더로 바로 이동합니다.',
    statusLabel: 'Library Overview'
  },
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

function getFallbackRoute(): AppRoute {
  return 'dashboard'
}

function getRouteFromHash(hash: string): HashRoute | undefined {
  if (hash === ROUTE_HASHES.dashboard) {
    return 'dashboard'
  }
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

  void outputRoot
  return getFallbackRoute()
}

export function App() {
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setPendingFileListPathSegments = useLibraryWorkspaceStore(
    (state) => state.setPendingFileListPathSegments
  )
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
        const fallbackRoute = getFallbackRoute()
        setRoute(fallbackRoute)
        return
      }

      setRoute(nextHashRoute)
      setIsSettingsOpen(false)
    }

    window.addEventListener('hashchange', handleHashChange)

    if (!window.location.hash) {
      window.location.hash = ROUTE_HASHES[getFallbackRoute()]
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

  function navigateToFilesPath(pathSegments: string[]): void {
    setPendingFileListPathSegments(pathSegments)
    navigate('files')
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
    { route: 'dashboard', label: 'Home', icon: <DashboardIcon className="h-5 w-5" /> },
    { route: 'organize', label: '정리', icon: <OrganizeIcon className="h-5 w-5" /> },
    { route: 'files', label: '파일 목록', icon: <FilesIcon className="h-5 w-5" /> },
    { route: 'browse', label: '지도', icon: <MapIcon className="h-5 w-5" /> }
  ]

  return (
    <main className="h-screen overflow-hidden px-1.5 py-1.5 lg:px-2 lg:py-2">
      <section className="mx-auto flex h-full w-full max-w-[min(99vw,1700px)] gap-2.5">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          onOpenSettings={openSettings}
          onPressBrand={() => navigate('dashboard')}
          items={navigationItems.map((item) => ({
            key: item.route,
            label: item.label,
            icon: item.icon,
            isActive: route === item.route,
            onPress: () => navigate(item.route)
          }))}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <AppTopbar
            title={routeMeta.title}
            description={routeMeta.description}
            statusLabel={routeMeta.statusLabel}
            onOpenSettings={openSettings}
          />

          <section className="app-page-section min-h-0 flex-1 overflow-hidden rounded-[18px] p-0.5 lg:p-1">
            {route === 'dashboard' ? (
              <DashboardPage
                onNavigateToBrowse={() => navigate('browse')}
                onNavigateToFilesPath={navigateToFilesPath}
                onNavigateToOrganize={() => navigate('organize')}
                onNavigateToSettings={openSettings}
              />
            ) : route === 'organize' ? (
              <OrganizePage
                onNavigateToSettings={openSettings}
              />
            ) : route === 'files' ? (
              <FileListPage onNavigateToSettings={openSettings} />
            ) : route === 'browse' ? (
              <BrowsePage onNavigateToSettings={openSettings} />
            ) : (
              <DashboardPage
                onNavigateToBrowse={() => navigate('browse')}
                onNavigateToFilesPath={navigateToFilesPath}
                onNavigateToOrganize={() => navigate('organize')}
                onNavigateToSettings={openSettings}
              />
            )}
          </section>

          <footer className="shrink-0 px-0.5 py-0.5">
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
