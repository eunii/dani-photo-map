import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { formatUnknownError } from '@shared/utils/formatUnknownError'

let cachedLogFilePath: string | undefined
let ensureDirectoryPromise: Promise<void> | undefined

function isTestRuntime(): boolean {
  return process.env.VITEST === 'true'
}

export function getAppLogFilePath(): string {
  if (cachedLogFilePath) {
    return cachedLogFilePath
  }

  cachedLogFilePath = join(process.cwd(), 'logs', 'dani-photo-map.log')

  return cachedLogFilePath
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
    ensureDirectoryPromise ??= mkdir(dirname(filePath), { recursive: true }).then(
      () => undefined
    )
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
