export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

export function getApiBaseUrl(): string {
  if (isElectron) {
    return 'http://localhost:3001'
  }
  return ''
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl()
  return base + path
}
