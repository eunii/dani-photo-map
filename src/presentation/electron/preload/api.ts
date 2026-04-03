import type { PreloadBridge } from '@shared/types/preload'

export const preloadBridge: PreloadBridge = {
  async getAppInfo() {
    return {
      name: 'Photo Organizer',
      version: '0.1.0'
    }
  },
  async ping() {
    return 'pong'
  }
}
