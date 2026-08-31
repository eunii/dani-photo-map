import { join, resolve } from 'node:path'
import { app, BrowserWindow, Notification, dialog, ipcMain, shell } from 'electron'

import { defaultMissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import {
  toFallbackGroupDetailView,
  toFallbackLibraryIndexView,
  toGroupDetailView,
  toLibraryIndexView
} from '@presentation/common/mappers/toLibraryIndexView'
import {
  createDeleteOutputFolderSubtreeUseCase,
  createDeletePhotosFromLibraryUseCase,
  createGenerateMissingThumbnailsUseCase,
  createLoadLibraryGroupDetailUseCase,
  createLoadLibraryIndexUseCase,
  createMovePhotosToGroupUseCase,
  createPreviewPendingOrganizationUseCase,
  createSaveHistoryStore,
  createScanPhotoLibraryUseCase,
  createUpdatePhotoGroupUseCase
} from '@presentation/electron/main/factories/createPhotoAppUseCases'
import {
  photoAppEventChannels,
  photoAppInvokeChannels
} from '@shared/ipc/photoAppChannels'
import { appLog } from '@shared/logging/appLog'
import { normalizePathSeparators } from '@shared/utils/path'
import { isResolvedPathUnderRoot } from '@shared/utils/pathScope'
import type { FileOutcomePayload } from '@application/dto/ScanPhotoLibraryProgress'
import type { SaveHistoryEntry } from '@application/dto/SaveHistoryEntry'
import type {
  DeleteOutputFolderSubtreeRequest,
  DeletePhotosFromLibraryRequest,
  DirectorySelectionOptions,
  GenerateMissingThumbnailsRequest,
  GetSaveHistoryRequest,
  LoadLibraryGroupDetailRequest,
  LoadLibraryIndexRequest,
  MovePhotosToGroupRequest,
  OpenOutputFileRequest,
  OrganizeJobStatus,
  PreviewPendingOrganizationRequest,
  ScanPhotoLibraryRequest,
  ScanPhotoLibrarySummary,
  StartOrganizeJobRequest,
  UpdatePhotoGroupRequest
} from '@shared/types/preload'

type OrganizeTaskKind = 'preview-load' | 'scan-save'
type OrganizeJobMode = StartOrganizeJobRequest['mode']

const ORGANIZE_FILE_OUTCOME_LOG_LIMIT = 5000

let organizeJobStatus: OrganizeJobStatus = {
  jobId: null,
  phase: 'idle',
  mode: null,
  updatedAtIso: new Date().toISOString(),
  isCancelRequested: false,
  progress: {
    completed: 0,
    total: 0
  }
}

let organizeFileOutcomeLog: FileOutcomePayload[] = []

function appendOrganizeFileOutcome(payload: FileOutcomePayload): void {
  organizeFileOutcomeLog.push(payload)
  if (organizeFileOutcomeLog.length > ORGANIZE_FILE_OUTCOME_LOG_LIMIT) {
    organizeFileOutcomeLog = organizeFileOutcomeLog.slice(
      organizeFileOutcomeLog.length - ORGANIZE_FILE_OUTCOME_LOG_LIMIT
    )
  }
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(photoAppEventChannels.organizeFileOutcome, payload)
  }
}

async function recordSaveHistoryEntry(params: {
  jobId: string
  startedAtIso: string
  sourceRoot: string
  outputRoot: string
  phase: SaveHistoryEntry['phase']
  message?: string
  summary: ScanPhotoLibrarySummary | null
}): Promise<void> {
  try {
    await createSaveHistoryStore().append(params.outputRoot, {
      jobId: params.jobId,
      startedAtIso: params.startedAtIso,
      completedAtIso: new Date().toISOString(),
      sourceRoot: params.sourceRoot,
      outputRoot: params.outputRoot,
      phase: params.phase,
      message: params.message,
      copiedCount: params.summary?.copiedCount ?? 0,
      duplicateCount: params.summary?.duplicateCount ?? 0,
      skippedExistingCount: params.summary?.skippedExistingCount ?? 0,
      warningCount: params.summary?.warningCount ?? 0,
      failureCount: params.summary?.failureCount ?? 0
    })
  } catch (error) {
    appLog('warn', 'failed to record save history', error)
  }
}

function mergeScanSummaries(
  previous: ScanPhotoLibrarySummary | null,
  next: ScanPhotoLibrarySummary
): ScanPhotoLibrarySummary {
  if (!previous) {
    return next
  }

  return {
    scannedCount: Math.max(previous.scannedCount, next.scannedCount),
    skippedUnchangedCount: previous.skippedUnchangedCount + next.skippedUnchangedCount,
    duplicateCount: previous.duplicateCount + next.duplicateCount,
    keptCount: previous.keptCount + next.keptCount,
    copiedCount: previous.copiedCount + next.copiedCount,
    skippedExistingCount: previous.skippedExistingCount + next.skippedExistingCount,
    skippedUnchangedDetails: [
      ...previous.skippedUnchangedDetails,
      ...next.skippedUnchangedDetails
    ],
    groupCount: Math.max(previous.groupCount, next.groupCount),
    warningCount: previous.warningCount + next.warningCount,
    failureCount: previous.failureCount + next.failureCount,
    issues: [...previous.issues, ...next.issues],
    inBatchDuplicateDetails: [
      ...previous.inBatchDuplicateDetails,
      ...next.inBatchDuplicateDetails
    ],
    existingOutputSkipDetails: [
      ...previous.existingOutputSkipDetails,
      ...next.existingOutputSkipDetails
    ],
    mapGroups: [...previous.mapGroups, ...next.mapGroups]
  }
}

function computeOrganizeProgress(
  offset: number,
  groupPhotoCount: number,
  payload: { kind: 'prepare' | 'fileFlowComplete'; completed: number; total: number }
): number {
  const safeTotal = payload.total > 0 ? payload.total : 1

  if (payload.kind === 'prepare') {
    return offset + Math.round((payload.completed / safeTotal) * 0.5 * groupPhotoCount)
  }

  return (
    offset +
    Math.round(
      0.5 * groupPhotoCount + (payload.completed / safeTotal) * 0.5 * groupPhotoCount
    )
  )
}

function emitOrganizeJobStatus(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(
      photoAppEventChannels.organizeJobStatusChanged,
      organizeJobStatus
    )
  }
}

function updateOrganizeJobStatus(
  next: Omit<Partial<OrganizeJobStatus>, 'progress'> & {
    progress?: Partial<OrganizeJobStatus['progress']>
  }
): void {
  organizeJobStatus = {
    ...organizeJobStatus,
    ...next,
    progress: {
      ...organizeJobStatus.progress,
      ...(next.progress ?? {})
    },
    updatedAtIso: new Date().toISOString()
  }
  emitOrganizeJobStatus()
}

function focusMainWindow(): void {
  const mainWindow = BrowserWindow.getAllWindows()[0]

  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

function showOrganizeTaskNotification(params: {
  kind: OrganizeTaskKind
  ok: boolean
  body: string
}): void {
  if (!Notification.isSupported()) {
    return
  }

  const title =
    params.kind === 'preview-load'
      ? params.ok
        ? '정리 후보 불러오기 완료'
        : '정리 후보 불러오기 실패'
      : params.ok
        ? '사진 정리 완료'
        : '사진 정리 실패'

  const notification = new Notification({
    title,
    body: params.body,
    silent: false
  })

  notification.on('click', () => {
    focusMainWindow()
  })

  notification.show()
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류'
}

async function runOrganizeJob(request: StartOrganizeJobRequest): Promise<void> {
  const jobId = `organize-${Date.now()}`
  const startedAtIso = new Date().toISOString()
  let mergedSummary: ScanPhotoLibrarySummary | null = null
  const shouldNotifyPreviewCompletion =
    request.mode !== 'preview' || request.notifyCompletion !== false

  organizeJobStatus = {
    jobId,
    phase: request.mode === 'preview' ? 'preview-running' : 'save-running',
    mode: request.mode,
    sourceRoot: request.sourceRoot,
    outputRoot: request.outputRoot,
    startedAtIso,
    updatedAtIso: new Date().toISOString(),
    isCancelRequested: false,
    message: undefined,
    progress: {
      completed: 0,
      total:
        request.mode === 'save-bulk'
          ? request.totalPhotoCount
          : 1,
      stage: request.mode === 'preview' ? 'preview' : 'prepare'
    },
    previewResult: undefined,
    summary: undefined
  }
  emitOrganizeJobStatus()

  if (request.mode === 'save-bulk') {
    organizeFileOutcomeLog = []
  }

  try {
    if (request.mode === 'preview') {
      const useCase = createPreviewPendingOrganizationUseCase()
      const previewResult = await useCase.execute(
        {
          sourceRoot: request.sourceRoot,
          outputRoot: request.outputRoot,
          forceFullRescan: request.forceFullRescan,
          missingGpsGroupingBasis:
            request.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
        },
        {
          onPreviewProgress: (payload) => {
            updateOrganizeJobStatus({
              progress: {
                completed: payload.completed,
                total: payload.total,
                stage: payload.stage === 'prepare' ? 'prepare' : 'preview'
              }
            })
          }
        }
      )

      updateOrganizeJobStatus({
        phase: 'preview-completed',
        previewResult,
        progress: {
          completed: 1,
          total: 1,
          stage: 'preview'
        }
      })

      if (shouldNotifyPreviewCompletion) {
        showOrganizeTaskNotification({
          kind: 'preview-load',
          ok: true,
          body: `신규 대상 ${previewResult.pendingPhotoCount}장, 그룹 ${previewResult.groups.length}개`
        })
      }
      return
    }

    for (const step of request.steps) {
      if (organizeJobStatus.jobId !== jobId || organizeJobStatus.isCancelRequested) {
        updateOrganizeJobStatus({
          phase: 'cancelled',
          message: '사용자 요청으로 작업이 취소되었습니다.'
        })
        await recordSaveHistoryEntry({
          jobId,
          startedAtIso,
          sourceRoot: request.sourceRoot,
          outputRoot: request.outputRoot,
          phase: 'cancelled',
          message: '사용자 요청으로 작업이 취소되었습니다.',
          summary: mergedSummary
        })
        return
      }

      const currentGroupKey = step.copyGroupKeysInThisRun[0]
      updateOrganizeJobStatus({
        message: currentGroupKey ? `${currentGroupKey} 처리 중` : '그룹 처리 중',
        progress: {
          stage: 'prepare',
          currentGroupKey
        }
      })

      const useCase = createScanPhotoLibraryUseCase({
        sourceRoot: request.sourceRoot,
        outputRoot: request.outputRoot
      })

      const nextSummary = await useCase.execute(
        {
          sourceRoot: request.sourceRoot,
          outputRoot: request.outputRoot,
          ...step.snapshotPayload,
          copyGroupKeysInThisRun: step.copyGroupKeysInThisRun,
          copySourcePathsInThisRun: step.copySourcePathsInThisRun,
          missingGpsGroupingBasis:
            step.snapshotPayload.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
        },
        {
          onScanProgress: (payload) => {
            if (organizeJobStatus.jobId !== jobId) {
              return
            }

            const completed = computeOrganizeProgress(
              step.progressOffsetBeforeJob,
              step.groupPhotoCount,
              payload
            )

            updateOrganizeJobStatus({
              progress: {
                completed,
                total: request.totalPhotoCount,
                stage: payload.kind === 'prepare' ? 'prepare' : 'file-flow',
                currentGroupKey
              }
            })
          },
          onFileOutcome: (payload) => {
            if (organizeJobStatus.jobId !== jobId) {
              return
            }
            appendOrganizeFileOutcome(payload)
          }
        }
      )

      mergedSummary = mergeScanSummaries(mergedSummary, nextSummary)
      updateOrganizeJobStatus({
        summary: mergedSummary
      })
    }

    updateOrganizeJobStatus({
      phase: 'completed',
      summary: mergedSummary ?? undefined,
      progress: {
        completed: request.totalPhotoCount,
        total: request.totalPhotoCount,
        stage: 'file-flow'
      }
    })

    const summary = mergedSummary
    if (summary) {
      showOrganizeTaskNotification({
        kind: 'scan-save',
        ok: true,
        body: `복사 ${summary.copiedCount}장, 경고 ${summary.warningCount}건, 오류 ${summary.failureCount}건`
      })
    }
    await recordSaveHistoryEntry({
      jobId,
      startedAtIso,
      sourceRoot: request.sourceRoot,
      outputRoot: request.outputRoot,
      phase: 'completed',
      summary: mergedSummary
    })
  } catch (error) {
    appLog('error', `organize job failed mode=${request.mode}`, error)
    updateOrganizeJobStatus({
      phase: 'failed',
      message: toErrorMessage(error)
    })
    if (request.mode !== 'preview' || shouldNotifyPreviewCompletion) {
      showOrganizeTaskNotification({
        kind: request.mode === 'preview' ? 'preview-load' : 'scan-save',
        ok: false,
        body: toErrorMessage(error)
      })
    }
    if (request.mode === 'save-bulk') {
      await recordSaveHistoryEntry({
        jobId,
        startedAtIso,
        sourceRoot: request.sourceRoot,
        outputRoot: request.outputRoot,
        phase: 'failed',
        message: toErrorMessage(error),
        summary: mergedSummary
      })
    }
  }
}

function registerIpcHandlers(): void {
  ipcMain.removeHandler(photoAppInvokeChannels.selectDirectory)
  ipcMain.handle(
    photoAppInvokeChannels.selectDirectory,
    async (_event, options: DirectorySelectionOptions) => {
      const result = await dialog.showOpenDialog({
        title: options.title,
        buttonLabel: options.buttonLabel,
        properties: ['openDirectory', 'createDirectory']
      })

      return result.canceled ? null : (result.filePaths[0] ?? null)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.loadLibraryIndex)
  ipcMain.handle(
    photoAppInvokeChannels.loadLibraryIndex,
    async (_event, command: LoadLibraryIndexRequest) => {
      const useCase = createLoadLibraryIndexUseCase()
      const result = await useCase.execute({
        ...command,
        mode: command.mode ?? 'default'
      })

      return {
        source: result.source,
        index: result.index
          ? toLibraryIndexView(result.index)
          : result.fallbackGroups
            ? toFallbackLibraryIndexView(
                command.outputRoot,
                new Date().toISOString(),
                result.fallbackGroups
              )
            : null
      }
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.loadLibraryGroupDetail)
  ipcMain.handle(
    photoAppInvokeChannels.loadLibraryGroupDetail,
    async (_event, command: LoadLibraryGroupDetailRequest) => {
      const useCase = createLoadLibraryGroupDetailUseCase()
      const result = await useCase.execute(command)

      if (result.index && result.group) {
        const photosById = new Map(
          result.index.photos.map((photo) => [photo.id, photo] as const)
        )

        return {
          group: toGroupDetailView(result.group, photosById)
        }
      }

      return {
        group: result.fallbackPhotos
          ? toFallbackGroupDetailView(
              command.groupId,
              result.pathSegments,
              result.fallbackPhotos
            )
          : null
      }
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.previewPendingOrganization)
  ipcMain.handle(
    photoAppInvokeChannels.previewPendingOrganization,
    async (event, command: PreviewPendingOrganizationRequest) => {
      const useCase = createPreviewPendingOrganizationUseCase()
      try {
        const result = await useCase.execute(
          {
            ...command,
            missingGpsGroupingBasis:
              command.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
          },
          {
            onPreviewProgress: (payload) => {
              event.sender.send(
                photoAppEventChannels.previewPendingOrganizationProgress,
                payload
              )
            }
          }
        )

        showOrganizeTaskNotification({
          kind: 'preview-load',
          ok: true,
          body: `신규 대상 ${result.pendingPhotoCount}장, 그룹 ${result.groups.length}개`
        })

        return result
      } catch (error) {
        appLog('error', 'preview ipc failed', error)
        showOrganizeTaskNotification({
          kind: 'preview-load',
          ok: false,
          body: toErrorMessage(error)
        })
        throw error
      }
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.scanPhotoLibrary)
  ipcMain.handle(
    photoAppInvokeChannels.scanPhotoLibrary,
    async (event, command: ScanPhotoLibraryRequest) => {
      const useCase = createScanPhotoLibraryUseCase(command)
      try {
        const result = await useCase.execute({
          ...command,
          missingGpsGroupingBasis:
            command.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
        }, {
          onScanProgress: (payload) => {
            event.sender.send(photoAppEventChannels.scanPhotoLibraryProgress, payload)
          }
        })

        return result
      } catch (error) {
        appLog('error', 'scan ipc failed', error)
        throw error
      }
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.startOrganizeJob)
  ipcMain.handle(
    photoAppInvokeChannels.startOrganizeJob,
    async (_event, request: StartOrganizeJobRequest) => {
      if (
        organizeJobStatus.phase === 'preview-running' ||
        organizeJobStatus.phase === 'save-running'
      ) {
        throw new Error('이미 정리 작업이 진행 중입니다.')
      }

      void runOrganizeJob(request)
      return organizeJobStatus
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.getOrganizeJobStatus)
  ipcMain.handle(photoAppInvokeChannels.getOrganizeJobStatus, async () => {
    return organizeJobStatus
  })

  ipcMain.removeHandler(photoAppInvokeChannels.getOrganizeFileOutcomeLog)
  ipcMain.handle(photoAppInvokeChannels.getOrganizeFileOutcomeLog, async () => {
    return organizeFileOutcomeLog
  })

  ipcMain.removeHandler(photoAppInvokeChannels.getSaveHistory)
  ipcMain.handle(
    photoAppInvokeChannels.getSaveHistory,
    async (_event, request: GetSaveHistoryRequest) => {
      return createSaveHistoryStore().load(request.outputRoot)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.cancelOrganizeJob)
  ipcMain.handle(photoAppInvokeChannels.cancelOrganizeJob, async () => {
    if (
      organizeJobStatus.phase !== 'preview-running' &&
      organizeJobStatus.phase !== 'save-running'
    ) {
      return {
        accepted: false
      }
    }

    updateOrganizeJobStatus({
      isCancelRequested: true,
      message: '취소를 요청했습니다. 현재 단계가 끝나면 중단됩니다.'
    })

    return {
      accepted: true
    }
  })

  ipcMain.removeHandler(photoAppInvokeChannels.updatePhotoGroup)
  ipcMain.handle(
    photoAppInvokeChannels.updatePhotoGroup,
    async (event, command: UpdatePhotoGroupRequest) => {
      const useCase = createUpdatePhotoGroupUseCase()
      const index = await useCase.execute(command, {
        onRenameProgress: (payload) => {
          event.sender.send(photoAppEventChannels.renamePlanProgress, payload)
        }
      })

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.movePhotosToGroup)
  ipcMain.handle(
    photoAppInvokeChannels.movePhotosToGroup,
    async (event, command: MovePhotosToGroupRequest) => {
      const useCase = createMovePhotosToGroupUseCase()
      const index = await useCase.execute(command, {
        onRenameProgress: (payload) => {
          event.sender.send(photoAppEventChannels.renamePlanProgress, payload)
        }
      })

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.deletePhotosFromLibrary)
  ipcMain.handle(
    photoAppInvokeChannels.deletePhotosFromLibrary,
    async (_event, command: DeletePhotosFromLibraryRequest) => {
      const useCase = createDeletePhotosFromLibraryUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.deleteOutputFolderSubtree)
  ipcMain.handle(
    photoAppInvokeChannels.deleteOutputFolderSubtree,
    async (_event, command: DeleteOutputFolderSubtreeRequest) => {
      const useCase = createDeleteOutputFolderSubtreeUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.openOutputFile)
  ipcMain.handle(
    photoAppInvokeChannels.openOutputFile,
    async (_event, command: OpenOutputFileRequest) => {
      const outputRoot = normalizePathSeparators(command.outputRoot)
      const fileAbsolutePath = resolve(join(outputRoot, command.relativePath))

      if (!isResolvedPathUnderRoot(outputRoot, fileAbsolutePath)) {
        return {
          opened: false,
          errorMessage: '파일 경로가 출력 폴더 밖을 가리킵니다.'
        }
      }

      const errorMessage = await shell.openPath(fileAbsolutePath)

      return errorMessage ? { opened: false, errorMessage } : { opened: true }
    }
  )

  ipcMain.removeHandler(photoAppInvokeChannels.generateMissingThumbnails)
  ipcMain.handle(
    photoAppInvokeChannels.generateMissingThumbnails,
    async (_event, command: GenerateMissingThumbnailsRequest) => {
      const useCase = createGenerateMissingThumbnailsUseCase(command)
      const result = await useCase.execute(command)

      return {
        index: toLibraryIndexView(result.index),
        attemptedCount: result.attemptedCount,
        succeededCount: result.succeededCount,
        failedCount: result.failedCount
      }
    }
  )
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: 'Dani Photo Map',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.dani.photomap')
  }

  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})