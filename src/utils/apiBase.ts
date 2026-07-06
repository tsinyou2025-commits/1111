import { Capacitor } from '@capacitor/core'
import { useAppStore } from '@/store/appStore'

export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
export const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform()

export function getApiBaseUrl(): string {
  // 优先使用用户自定义的 API 服务器地址
  try {
    const customServer = useAppStore.getState().settings.customApiServer
    if (customServer && customServer.trim()) {
      return customServer.trim().replace(/\/$/, '')
    }
  } catch {}

  if (isElectron) {
    return 'http://localhost:3001'
  }
  if (isCapacitor) {
    return 'https://1111-two-iota.vercel.app'
  }
  return ''
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl()
  return base + path
}
