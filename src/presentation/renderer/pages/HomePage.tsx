import { useEffect, useState } from 'react'

import { GroupListPanel } from '@presentation/renderer/components/GroupListPanel'
import { GroupsMap } from '@presentation/renderer/components/GroupsMap'
import type {
  AppInfo,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'

const STORAGE_KEYS = {
  sourceRoot: 'photo-organizer/source-root',
  outputRoot: 'photo-organizer/output-root'
} as const

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

function readStoredPath(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function persistPath(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    void key
    void value
  }
}

export function HomePage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [sourceRoot, setSourceRoot] = useState(() =>
    readStoredPath(STORAGE_KEYS.sourceRoot)
  )
  const [outputRoot, setOutputRoot] = useState(() =>
    readStoredPath(STORAGE_KEYS.outputRoot)
  )
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()

  useEffect(() => {
    void window.photoApp.getAppInfo().then(setAppInfo)
  }, [])

  useEffect(() => {
    persistPath(STORAGE_KEYS.sourceRoot, sourceRoot)
  }, [sourceRoot])

  useEffect(() => {
    persistPath(STORAGE_KEYS.outputRoot, outputRoot)
  }, [outputRoot])

  async function selectSourceRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      SOURCE_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setSourceRoot(selectedPath)
      setSummary(null)
      setSelectedGroupId(undefined)
      setErrorMessage(null)
    }
  }

  async function selectOutputRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      OUTPUT_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setOutputRoot(selectedPath)
      setSummary(null)
      setSelectedGroupId(undefined)
      setErrorMessage(null)
    }
  }

  async function handleScan(): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
      return
    }

    setIsScanning(true)
    setErrorMessage(null)

    try {
      const nextSummary = await window.photoApp.scanPhotoLibrary({
        sourceRoot,
        outputRoot
      })

      setSummary(nextSummary)
      setSelectedGroupId(nextSummary.mapGroups[0]?.id)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
      )
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              {appInfo ? `${appInfo.name} ${appInfo.version}` : 'Photo Organizer MVP'}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              로컬 사진 폴더 정리 준비가 되었습니다.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              원본 사진 폴더와 출력 폴더를 선택한 뒤 정리를 실행하세요. 현재는
              MVP 초기 흐름으로 스캔, EXIF 읽기, 중복 검사, 복사, 인덱스 생성을
              연결해 둔 상태입니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  원본 사진 폴더
                </h2>
                <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                  {sourceRoot || '아직 선택되지 않았습니다.'}
                </p>
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => void selectSourceRoot()}
                >
                  원본 폴더 선택
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
                <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                  {outputRoot || '아직 선택되지 않았습니다.'}
                </p>
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => void selectOutputRoot()}
                >
                  출력 폴더 선택
                </button>
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isScanning}
              onClick={() => void handleScan()}
            >
              {isScanning ? '정리 중...' : '사진 정리 실행'}
            </button>
            <p className="text-sm text-slate-500">
              EXIF 메타데이터 읽기, SHA-256 중복 검사, 결과 복사 및 `index.json`
              생성까지 실행합니다.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {summary ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-emerald-900">
                  실행 결과
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">스캔 수</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {summary.scannedCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">유지 수</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {summary.keptCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">중복 수</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {summary.duplicateCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">그룹 수</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {summary.groupCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                지도 및 그룹 개요
              </h2>
              <p className="text-xs text-slate-500">
                스캔 결과 중 GPS가 있는 대표 그룹을 우선 확인합니다.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <GroupsMap
                groups={summary?.mapGroups ?? []}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
              />
              <GroupListPanel
                groups={summary?.mapGroups ?? []}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
              />
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Photo Organizer MVP
            <br />
            원본 파일은 수정하지 않고 복사 기준으로 처리합니다. 물리 폴더는
            `year / month / region` 구조를 사용하고, 논리 그룹은
            `.photo-organizer/index.json`에 저장됩니다.
          </div>
        </div>
      </section>
    </main>
  )
}