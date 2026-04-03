import { useState } from 'react'

import type { ScanPhotoLibrarySummary } from '@shared/types/preload'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

interface OrganizePageProps {
  onNavigateToBrowse?: () => void
}

export function OrganizePage({ onNavigateToBrowse }: OrganizePageProps) {
  const sourceRoot = useLibraryWorkspaceStore((state) => state.sourceRoot)
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setSourceRoot = useLibraryWorkspaceStore((state) => state.setSourceRoot)
  const setOutputRoot = useLibraryWorkspaceStore((state) => state.setOutputRoot)
  const setLastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.setLastLoadedIndex
  )
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)

  async function selectSourceRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      SOURCE_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setSourceRoot(selectedPath)
      setSummary(null)
      setErrorMessage(null)
    }
  }

  async function selectOutputRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      OUTPUT_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setOutputRoot(selectedPath)
      setLastLoadedIndex(null)
      setSummary(null)
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
      const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })

      setSummary(nextSummary)
      setLastLoadedIndex(loadedIndex)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
      )
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          사진 정리 실행
        </h1>
        <p className="text-base leading-7 text-slate-600">
          원본 사진 폴더와 출력 폴더를 선택한 뒤 정리를 실행하세요. 정리
          페이지는 스캔, EXIF 읽기, 중복 검사, 복사, 인덱스 생성 결과를
          확인하는 데 집중합니다.
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
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          disabled={!outputRoot}
          onClick={onNavigateToBrowse}
        >
          조회 페이지 열기
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-emerald-900">
                실행 결과
              </h2>
              <button
                type="button"
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
                onClick={onNavigateToBrowse}
              >
                결과 조회로 이동
              </button>
            </div>
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
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">경고 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.warningCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">실패 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.failureCount}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
