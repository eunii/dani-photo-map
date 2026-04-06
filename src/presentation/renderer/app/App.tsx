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

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

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

  const navigationItems: Array<{ route: AppRoute; label: string }> = [
    { route: 'organize', label: '정리' },
    { route: 'files', label: '파일 목록' },
    { route: 'browse', label: '지도' },
    { route: 'settings', label: '설정' }
  ]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 lg:px-5 lg:py-5">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[min(96vw,1600px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-[calc(100vh-2.5rem)]">
        <div className="flex flex-1 flex-col gap-6 px-5 py-5 lg:px-8 lg:py-7">
          <header className="space-y-4 border-b border-slate-100 pb-5">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Dani Photo Map
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">
                {routeTitle}
              </h1>
              <p className="text-sm text-slate-500">
                정리와 탐색은 같은 작업공간 안에서 이어집니다.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {navigationItems.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  aria-current={route === item.route ? 'page' : undefined}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors min-w-[120px] ${
                    route === item.route
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => navigate(item.route)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <div className="flex-1">
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
          </div>

          <footer className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              원본은 수정하지 않고, 정리 결과는 출력 폴더와
              `.photo-organizer/index.json`에 저장됩니다.
            </p>
          </footer>
        </div>
      </section>
    </main>
  )
}
