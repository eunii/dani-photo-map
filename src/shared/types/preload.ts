export interface AppInfo {
  name: string
  version: string
}

export interface PreloadBridge {
  getAppInfo: () => Promise<AppInfo>
  ping: () => Promise<string>
}
