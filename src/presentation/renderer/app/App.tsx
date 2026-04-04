import { useEffect, useMemo, useState } from 'react'

import { BrowsePage } from '@presentation/renderer/pages/BrowsePage'
import { OrganizePage } from '@presentation/renderer/pages/OrganizePage'

type AppRoute = 'organize' | 'browse'

const ROUTE_HASHES: Record<AppRoute, string> = {
  organize: '#/organize',
  browse: '#/browse'
}

function getRouteFromHash(hash: string): AppRoute {
  return hash === ROUTE_HASHES.browse ? 'browse' : 'organize'
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

  const routeTitle = useMemo(
    () => (route === 'organize' ? '정리' : '조회'),
    [route]
  )

  function navigate(nextRoute: AppRoute): void {
    const nextHash = ROUTE_HASHES[nextRoute]

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
      return
    }

    setRoute(nextRoute)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="w-full max-w-7xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                Dani Photo Map
              </p>
              <p className="text-xs text-slate-500">다니 포토 맵</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {routeTitle} 워크플로우
              </h1>
              <p className="text-sm text-slate-600">
                정리와 조회를 분리해 실행 흐름과 결과 탐색 흐름을 각각 다룹니다.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  route === 'organize'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700'
                }`}
                onClick={() => navigate('organize')}
              >
                정리
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  route === 'browse'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700'
                }`}
                onClick={() => navigate('browse')}
              >
                조회
              </button>
            </nav>
          </div>

          {route === 'organize' ? (
            <OrganizePage onNavigateToBrowse={() => navigate('browse')} />
          ) : (
            <BrowsePage />
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            원본 파일은 수정하지 않고 복사 기준으로 처리합니다. 물리 폴더는
            `year / month / region` 구조를 유지하고, 논리 그룹은
            `.photo-organizer/index.json`에 저장됩니다.
          </div>
        </div>
      </section>
    </main>
  )
}
