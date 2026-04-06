import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'

export function SettingsPage() {
  const {
    outputRoot,
    isLoadingIndex,
    errorMessage,
    selectOutputRoot,
    reloadLibraryIndex,
    loadSource
  } = useOutputLibraryIndexPanel()
  const sourceBadge = getLoadSourceBadge(loadSource)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">출력 폴더 설정</h2>
        <p className="text-sm text-slate-600">
          공통 출력 폴더는 여기서만 관리합니다.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">출력 폴더</h3>
          <p className="min-h-12 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
            {outputRoot || '아직 선택되지 않았습니다.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!outputRoot || isLoadingIndex}
              onClick={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </button>
          </div>
          <p className="text-sm text-slate-500">
            파일 목록과 지도는 이 경로를 공통으로 사용합니다.
          </p>
        </div>
      </section>

      {sourceBadge ? (
        <section className={`rounded-2xl border px-4 py-3 text-sm ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
