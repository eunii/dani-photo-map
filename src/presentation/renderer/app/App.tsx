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

/** 사이드바 메뉴와 메인 상단 제목을 동일하게 유지 */
const PAGE_TITLE: Record<AppRoute, string> = {
  dashboard: 'Home',
  organize: '사진 정리하기',
  files: '파일 목록 조회',
  browse: '지도에서 사진보기'
}

const ROUTE_META: Record<AppRoute, { title: string; description: string }> = {
  dashboard: {
    title: PAGE_TITLE.dashboard,
    description: ''
  },
  organize: {
    title: PAGE_TITLE.organize,
    description: '스캔 후 후보를 만들고 저장합니다.'
  },
  files: {
    title: PAGE_TITLE.files,
    description: '출력 폴더 구조와 사진 목록을 경로 단위로 탐색합니다.'
  },
  browse: {
    title: PAGE_TITLE.browse,
    description: '대표 사진과 그룹 메타데이터를 지도로 빠르게 살펴봅니다.'
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
    {
      route: 'dashboard',
      label: PAGE_TITLE.dashboard,
      icon: <DashboardIcon className="h-5 w-5" />
    },
    {
      route: 'organize',
      label: PAGE_TITLE.organize,
      icon: <OrganizeIcon className="h-5 w-5" />
    },
    {
      route: 'files',
      label: PAGE_TITLE.files,
      icon: <FilesIcon className="h-5 w-5" />
    },
    {
      route: 'browse',
      label: PAGE_TITLE.browse,
      icon: <MapIcon className="h-5 w-5" />
    }
  ]

  return (
    <main className="box-border flex h-svh min-h-0 w-full max-w-full flex-col overflow-hidden px-1 py-1 lg:px-1.5 lg:py-1.5">
      <section className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[min(100%,1700px)] flex-1 gap-1.5">
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <AppTopbar
            title={routeMeta.title}
            description={routeMeta.description}
          />

          <section className="app-page-section flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] p-0.5 lg:p-1">
            <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
            {route === 'dashboard' ? (
              <DashboardPage
                onNavigateToFilesPath={navigateToFilesPath}
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
                onNavigateToFilesPath={navigateToFilesPath}
                onNavigateToSettings={openSettings}
              />
            )}
            </div>
          </section>

          <footer
            className="shrink-0 border-t border-[var(--app-border)] pt-1"
            role="contentinfo"
          >
            <div className="flex min-h-[42px] items-center px-0.5">
              <p className="max-w-[52rem] text-[11px] leading-snug text-[var(--app-muted)] lg:text-[12px] lg:leading-relaxed">
                원본 파일은 읽기만 하며 변경하지 않습니다. 정리본·인덱스·썸네일은
                설정한 출력 폴더의{' '}
                <span className="font-mono text-[10px] text-[var(--app-foreground)]/80 lg:text-[11px]">
                  .photo-organizer
                </span>{' '}
                아래에 기록됩니다.
              </p>
            </div>
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
