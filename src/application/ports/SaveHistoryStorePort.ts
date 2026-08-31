import type { SaveHistoryEntry } from '@application/dto/SaveHistoryEntry'

export interface SaveHistoryStorePort {
  load(outputRoot: string): Promise<SaveHistoryEntry[]>
  append(outputRoot: string, entry: SaveHistoryEntry): Promise<void>
}
