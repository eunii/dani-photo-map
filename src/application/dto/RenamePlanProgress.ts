export interface RenamePlanProgressPayload {
  completed: number
  total: number
}

export interface RenamePlanExecuteOptions {
  onRenameProgress?: (payload: RenamePlanProgressPayload) => void
}
