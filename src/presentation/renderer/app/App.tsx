import { useEffect, useMemo, useState } from 'react'

import { BrowsePage } from '@presentation/renderer/pages/BrowsePage'
import { FileListPage } from '@presentation/renderer/pages/FileListPage'
import { OrganizePage } from '@presentation/renderer/pages/OrganizePage'
import { SettingsPage } from '@presentation/renderer/pages/SettingsPage'

type AppRoute = 'organize' | 'files' | 'browse' | 'settings'

const ROUTE_HASHES: Record<AppRoute, string> = {
  organize: '#/organize',
  files: '#/files',
  browse: '#/browse',
  settings: '#/settings'
}

function getRouteFromHash(hash: string): AppRoute {
  if (hash === ROUTE_HASHES.files) {
    return 'files'
  }
  if (hash === ROUTE_HASHES.browse) {
    return 'browse'
  }
  if (hash === ROUTE_HASHES.settings) {
    return 'settings'
  }
  return 'organize'
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromHash(window.location.hash)
  )

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', handleHashChange)

    if (!window.location.hash) {
      window.location.hash = ROUTE_HASHES.organize
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const routeTitle = useMemo(() => {
    if (route === 'organize') {
      return '정리'
    }
    if (route === 'files') {
      return '파일 목록'
    }
    if (route === 'browse') {
      return '지도'
    }
    return '설정'
  }, [route])

  function navigate(nextRoute: AppRoute): void {
    const nextHash = ROUTE_HASHES[nextRoute]

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
      return
    }

    setRoute(nextRoute)
  }

  const isBrowseRoute = route === 'browse'
  const navigationItems: Array<{ route: AppRoute; label: string }> = [
    { route: 'organize', label: '정리' },
    { route: 'files', label: '파일 목록' },
    { route: 'browse', label: '지도' },
    { route: 'settings', label: '설정' }
  ]

  return (
    <main
      className={`flex min-h-screen ${isBrowseRoute ? 'items-stretch p-4' : 'items-center justify-center p-8'}`}
    >
      <section
        className={`w-full rounded-2xl border border-slate-200 bg-white shadow-sm ${
          isBrowseRoute ? 'mx-auto max-w-[96vw] p-6' : 'max-w-7xl p-10'
        }`}
      >
        <div className="space-y-6">
          <header className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Dani Photo Map
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {routeTitle}
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {navigationItems.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    route === item.route
                      ? 'bg-slate-900 text-white'
                      : item.route === 'settings'
                        ? 'bg-white text-slate-500'
                        : 'bg-white text-slate-700'
                  }`}
                  onClick={() => navigate(item.route)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <div>
            <p className="text-sm text-slate-500">
              정리와 탐색은 분리하고, 공통 경로는 설정에서 관리합니다.
            </p>
          </div>

          {route === 'organize' ? (
            <OrganizePage
              onNavigateToBrowse={() => navigate('browse')}
              onNavigateToSettings={() => navigate('settings')}
            />
          ) : route === 'files' ? (
            <FileListPage onNavigateToSettings={() => navigate('settings')} />
          ) : route === 'browse' ? (
            <BrowsePage onNavigateToSettings={() => navigate('settings')} />
          ) : (
            <SettingsPage />
          )}

          <p className="text-xs text-slate-500">
            원본은 수정하지 않고, 정리 결과는 출력 폴더와
            `.photo-organizer/index.json`에 저장됩니다.
          </p>
        </div>
      </section>
    </main>
  )
}
