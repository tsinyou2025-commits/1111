import { Capacitor } from '@capacitor/core'

export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
export const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform()

export function getApiBaseUrl(): string {
  if (isElectron) {
    return 'http://localhost:3001'
  }
  if (isCapacitor) {
    return 'https://long-night-stories.vercel.app'
  }
  return ''
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl()
  return base + path
}
