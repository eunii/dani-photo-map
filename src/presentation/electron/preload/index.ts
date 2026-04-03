import { contextBridge } from 'electron'

import { preloadBridge } from './api'

contextBridge.exposeInMainWorld('photoApp', preloadBridge)
