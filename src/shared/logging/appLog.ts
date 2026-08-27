import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { formatUnknownError } from '@shared/utils/formatUnknownError'

let currentLogFilePath: string | undefined
let ensureDirectoryPromise: Promise<void> | undefined

function isTestRuntime(): boolean {
  return process.env.VITEST === 'true'
}

export function getAppLogsDirectory(): string {
  return join(process.cwd(), 'logs')
}

export function createRunLogFileName(
  kind: string,
  at: Date = new Date()
): string {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  const stamp = [
    at.getFullYear(),
    pad(at.getMonth() + 1),
    pad(at.getDate()),
    '-',
    pad(at.getHours()),
    pad(at.getMinutes()),
    pad(at.getSeconds()),
    '-',
    pad(at.getMilliseconds(), 3)
  ].join('')
  const safeKind = kind.replaceAll(/[^a-z0-9_-]/gi, '').toLowerCase() || 'run'

  return `${stamp}-${safeKind}.log`
}

export function getAppLogFilePath(): string {
  if (currentLogFilePath) {
    return currentLogFilePath
  }

  currentLogFilePath = join(
    getAppLogsDirectory(),
    createRunLogFileName('session')
  )

  return currentLogFilePath
}

export function startAppLogRun(kind: string): string {
  currentLogFilePath = join(getAppLogsDirectory(), createRunLogFileName(kind))
  ensureDirectoryPromise = undefined

  return currentLogFilePath
}

function formatExtra(extra: unknown): string {
  if (extra instanceof Error) {
    return extra.stack ?? extra.message
  }

  return formatUnknownError(extra)
}

async function appendLogLine(line: string): Promise<void> {
  const filePath = getAppLogFilePath()

  try {
    ensureDirectoryPromise ??= mkdir(getAppLogsDirectory(), {
      recursive: true
    }).then(() => undefined)
    await ensureDirectoryPromise
    await appendFile(filePath, `${line}\n`, 'utf8')
  } catch {
    ensureDirectoryPromise = undefined
  }
}

export function appLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  extra?: unknown
): void {
  if (isTestRuntime()) {
    return
  }

  const extraText = extra === undefined ? '' : ` ${formatExtra(extra)}`
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${extraText}`

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }

  void appendLogLine(line)
}
