import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Key, Globe, Mic, Palette, Volume2, Gauge, Check, AlertCircle, Sparkles, Download, RefreshCw, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useSpeech } from '@/hooks/useSpeech'
import { cn } from '@/lib/utils'
import { getApiUrl, isElectron, isCapacitor } from '@/utils/apiBase'
import { App as CapacitorApp } from '@capacitor/app'


interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  icon: string
  color: string
  keyPlaceholder: string
}

const providers: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    icon: '🔮',
    color: 'from-blue-500 to-indigo-600',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'xiaomi',
    name: '小米 MiMo',
    baseUrl: 'https://api.xiaomi.com/v1',
    defaultModel: 'mi-mo-v1-flash',
    icon: '📱',
    color: 'from-orange-500 to-red-500',
    keyPlaceholder: '请输入小米 API Key',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    icon: '💎',
    color: 'from-purple-500 to-pink-500',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    icon: '🤖',
    color: 'from-green-500 to-emerald-600',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    defaultModel: '',
    icon: '⚙️',
    color: 'from-slate-500 to-slate-600',
    keyPlaceholder: '请输入 API Key',
  },
]

function detectProvider(baseUrl: string): string {
  if (!baseUrl) return 'custom'
  if (baseUrl.includes('deepseek')) return 'deepseek'
  if (baseUrl.includes('xiaomi')) return 'xiaomi'
  if (baseUrl.includes('googleapis') || baseUrl.includes('gemini')) return 'gemini'
  if (baseUrl.includes('openai')) return 'openai'
  return 'custom'
}

export default function Settings() {
  const { settings, setSettings } = useAppStore()
  const { availableVoices, speakSentence, stop } = useSpeech()
  
  const [localSettings, setLocalSettings] = useState(settings)
  const [selectedProvider, setSelectedProvider] = useState(detectProvider(settings.aiBaseUrl))
  const [testingVoice, setTestingVoice] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [modelList, setModelList] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)

  const handleSelectProvider = (provider: ProviderConfig) => {
    setSelectedProvider(provider.id)
    if (provider.id !== 'custom') {
      setLocalSettings((prev) => ({
        ...prev,
        aiBaseUrl: provider.baseUrl,
        model: provider.defaultModel,
      }))
    }
  }

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const fetchModels = async () => {
    if (!localSettings.aiBaseUrl || !localSettings.apiKey) return
    
    setLoadingModels(true)
    try {
      const res = await fetch(getApiUrl(`/api/story/models?baseUrl=${encodeURIComponent(localSettings.aiBaseUrl)}&apiKey=${encodeURIComponent(localSettings.apiKey)}`))
      const data = await res.json()
      if (data.data && Array.isArray(data.data)) {
        setModelList(data.data.map((m: any) => m.id))
      }
    } catch (err) {
      console.error('获取模型列表失败', err)
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => {
    if (localSettings.aiBaseUrl && localSettings.apiKey) {
      fetchModels()
    }
  }, [])

  useEffect(() => {
    if (isElectron) {
      const api = (window as any).electronAPI
      api.getAppVersion().then((v: string) => setAppVersion(v))

      api.onUpdateAvailable((info: any) => {
        setUpdateStatus('available')
        setUpdateInfo(info)
      })
      api.onUpdateNotAvailable(() => {
        setUpdateStatus('not-available')
      })
      api.onDownloadProgress((progress: any) => {
        setDownloadProgress(progress.percent || 0)
      })
      api.onUpdateDownloaded(() => {
        setUpdateStatus('downloaded')
      })
      api.onUpdateError(() => {
        setUpdateStatus('error')
      })
    } else if (isCapacitor) {
      CapacitorApp.getInfo().then((info) => {
        setAppVersion(info.version)
      })
    }
  }, [])

  const handleSave = () => {
    setSettings(localSettings)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleCheckUpdate = async () => {
    if (isElectron) {
      setUpdateStatus('checking')
      setDownloadProgress(0)
      await (window as any).electronAPI.checkUpdate()
    } else if (isCapacitor) {
      setUpdateStatus('checking')
      try {
        const res = await fetch('https://api.github.com/repos/tsinyou2025-commits/1111/releases/latest')
        const data = await res.json()
        if (data.tag_name) {
          const latestVersion = data.tag_name.replace(/^v/, '')
          const currentVersion = appVersion
          if (compareVersions(latestVersion, currentVersion) > 0) {
            setUpdateStatus('available')
            setUpdateInfo({
              version: latestVersion,
              url: data.html_url,
              apkUrl: data.assets?.find((a: any) => a.name.endsWith('.apk'))?.browser_download_url,
            })
          } else {
            setUpdateStatus('not-available')
          }
        } else {
          // GitHub API 返回了 404 (通常是因为私有仓库没有权限)
          setUpdateStatus('error')
        }
      } catch (e) {
        setUpdateStatus('error')
      }
    }
  }

  const handleDownloadUpdate = async () => {
    if (isElectron) {
      setUpdateStatus('downloading')
      await (window as any).electronAPI.downloadUpdate()
    } else if (isCapacitor && (updateInfo?.apkUrl || updateInfo?.url)) {
      const downloadUrl = updateInfo.apkUrl || updateInfo.url
      setUpdateStatus('downloading')
      // 用系统浏览器（真实的 Chrome / 系统下载器）打开，
      // 这样 APK 会正确写入手机的"下载"目录
      await CapacitorApp.openUrl({ url: downloadUrl })
      // 系统浏览器在后台运行，用户切回 App 时即视为"已发起下载"
      // 给用户显示安装引导
      setTimeout(() => setUpdateStatus('downloaded'), 1500)
    }
  }

  const handleInstallUpdate = async () => {
    if (isElectron) {
      await (window as any).electronAPI.installUpdate()
    }
  }

  function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number)
    const partsB = b.split('.').map(Number)
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0
      const numB = partsB[i] || 0
      if (numA > numB) return 1
      if (numA < numB) return -1
    }
    return 0
  }

  const handleTestVoice = () => {
    if (testingVoice) {
      stop()
      setTestingVoice(false)
    } else {
      setTestingVoice(true)
      speakSentence('这是一个测试语音，用来试听当前选择的语音效果。')
      setTimeout(() => setTestingVoice(false), 5000)
    }
  }

  const chineseVoices = availableVoices.filter((v) => v.lang.startsWith('zh'))
  const otherVoices = availableVoices.filter((v) => !v.lang.startsWith('zh'))
  const sortedVoices = [...chineseVoices, ...otherVoices]

  const fontSizeOptions = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ] as const

  return (
    <div className="min-h-screen md:pl-64 pb-24 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <SettingsIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">设置</h1>
            <p className="text-sm text-slate-400">配置你的个性化体验</p>
          </div>
        </div>

        {/* AI 接口配置 */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe size={20} className="text-amber-400" />
            <h2 className="text-lg font-medium text-white">AI 接口配置</h2>
          </div>

          <div className="space-y-5">
            {/* 服务商选择 */}
            <div>
              <label className="text-sm text-slate-400 mb-3 block flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                选择 AI 服务商
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleSelectProvider(provider)}
                    className={cn(
                      'p-3 rounded-xl border transition-all duration-300 text-left',
                      selectedProvider === provider.id
                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                    )}
                  >
                    <div className="text-xl mb-1">{provider.icon}</div>
                    <div className={cn(
                      'text-sm font-medium',
                      selectedProvider === provider.id ? 'text-amber-300' : 'text-slate-300'
                    )}>
                      {provider.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL - 只有自定义时显示 */}
            {selectedProvider === 'custom' && (
              <div>
                <label className="text-sm text-slate-400 mb-2 block">API Base URL</label>
                <input
                  type="text"
                  value={localSettings.aiBaseUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, aiBaseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">支持 OpenAI 兼容的接口</p>
              </div>
            )}

            {/* 显示当前选中服务商的 Base URL（非自定义时） */}
            {selectedProvider !== 'custom' && (
              <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-700/30">
                <p className="text-xs text-slate-500 mb-1">接口地址</p>
                <p className="text-sm text-slate-400 font-mono break-all">
                  {providers.find((p) => p.id === selectedProvider)?.baseUrl}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                <Key size={14} className="inline mr-1" />
                API Key
              </label>
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                placeholder={providers.find((p) => p.id === selectedProvider)?.keyPlaceholder || '请输入 API Key'}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">模型</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localSettings.model}
                  onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
                <button
                  onClick={fetchModels}
                  disabled={loadingModels}
                  className="px-4 py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {loadingModels ? '...' : '刷新'}
                </button>
              </div>
              {modelList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {modelList.slice(0, 10).map((m) => (
                    <button
                      key={m}
                      onClick={() => setLocalSettings({ ...localSettings, model: m })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs transition-all',
                        localSettings.model === m
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 语音设置 */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Mic size={20} className="text-amber-400" />
            <h2 className="text-lg font-medium text-white">语音设置</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm text-slate-400 mb-3 block flex items-center gap-2">
                <Mic size={14} />
                选择语音 (微软云端语音)
                <span className="text-xs text-slate-500">（共 {availableVoices.length} 个）</span>
              </label>
              
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={handleTestVoice}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm transition-all',
                    testingVoice
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  )}
                >
                  {testingVoice ? '停止试听' : '试听当前'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-700/50 rounded-xl p-2">
                {availableVoices.length > 0 && (
                  <div className="pt-2">
                    {availableVoices.map((voice) => (
                      <button
                        key={voice.name}
                        onClick={() => setLocalSettings({ ...localSettings, voiceName: voice.name })}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                          localSettings.voiceName === voice.name
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'hover:bg-slate-800/50 text-slate-300'
                        )}
                      >
                        <div className="text-sm font-medium truncate">{voice.label || voice.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{voice.lang}</span>
                          <span className="text-emerald-400">· 微软高品质接口</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                <Gauge size={14} />
                语速：{localSettings.speechRate.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={localSettings.speechRate}
                onChange={(e) => setLocalSettings({ ...localSettings, speechRate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>慢</span>
                <span>正常</span>
                <span>快</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                <Volume2 size={14} />
                音量：{Math.round(localSettings.speechVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.speechVolume}
                onChange={(e) => setLocalSettings({ ...localSettings, speechVolume: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 外观设置 */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Palette size={20} className="text-amber-400" />
            <h2 className="text-lg font-medium text-white">外观设置</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm text-slate-400 mb-3 block">字体大小</label>
              <div className="grid grid-cols-3 gap-3">
                {fontSizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLocalSettings({ ...localSettings, fontSize: opt.value })}
                    className={cn(
                      'py-3 rounded-xl transition-all',
                      localSettings.fontSize === opt.value
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 版本更新 - Electron 或 Capacitor 环境显示 */}
        {(isElectron || isCapacitor) && (
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw size={20} className="text-amber-400" />
              <h2 className="text-lg font-medium text-white">版本更新</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">当前版本</span>
                <div className="text-right">
                  <div className="text-sm text-white font-mono">v{appVersion || '网页版'}</div>
                  <div className="text-xs text-amber-500/80 mt-1">内核: 06-30 12:05</div>
                </div>
              </div>

              {updateStatus === 'idle' && (
                <button
                  onClick={handleCheckUpdate}
                  className="w-full py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  检查更新
                </button>
              )}

              {updateStatus === 'checking' && (
                <div className="py-3 rounded-xl bg-slate-700/30 border border-slate-600/50 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">正在检查更新...</span>
                  </div>
                </div>
              )}

              {updateStatus === 'not-available' && (
                <div className="py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <CheckCircle size={16} />
                    <span className="text-sm">当前已是最新版本</span>
                  </div>
                </div>
              )}

              {updateStatus === 'available' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-300 mb-2">
                      <Sparkles size={16} />
                      <span className="text-sm font-medium">发现新版本</span>
                    </div>
                    {updateInfo?.version && (
                      <p className="text-xs text-amber-200/70">新版本：v{updateInfo.version}</p>
                    )}
                  </div>
                  <button
                    onClick={handleDownloadUpdate}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isCapacitor ? (
                      <>
                        <ExternalLink size={16} />
                        前往下载更新
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        下载更新
                      </>
                    )}
                  </button>
                </div>
              )}

              {updateStatus === 'downloading' && !isCapacitor && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">正在下载...</span>
                    <span className="text-amber-400">{downloadProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {updateStatus === 'downloading' && isCapacitor && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-300 mb-3">
                      <Download size={16} className="animate-bounce" />
                      <span className="text-sm font-medium">APK 下载中...</span>
                    </div>
                    <p className="text-xs text-amber-200/70 leading-relaxed">
                      正在系统浏览器中下载安装包，请稍候。
                      下载完成后，<span className="text-amber-300 font-medium">关闭浏览器</span>即可进入安装引导。
                    </p>
                  </div>
                </div>
              )}

              {updateStatus === 'downloaded' && !isCapacitor && (
                <div className="space-y-3">
                  <div className="py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                      <CheckCircle size={16} />
                      <span className="text-sm">更新包下载完成</span>
                    </div>
                  </div>
                  <button
                    onClick={handleInstallUpdate}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    立即安装更新
                  </button>
                </div>
              )}

              {updateStatus === 'downloaded' && isCapacitor && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-300 mb-3">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">下载完成，请手动安装</span>
                    </div>
                    <ol className="text-xs text-emerald-200/70 leading-relaxed space-y-1.5">
                      <li>1. 下拉手机<span className="text-emerald-300 font-medium">通知栏</span>，找到刚刚下载的 APK 文件</li>
                      <li>2. 点击该通知，系统会弹出安装界面</li>
                      <li>3. 如提示"未知来源"，请允许安装并继续</li>
                      <li>4. 安装完成后重新打开 App 即可</li>
                    </ol>
                  </div>
                  <button
                    onClick={() => { setUpdateStatus('idle') }}
                    className="w-full py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    我已安装完成
                  </button>
                </div>
              )}

              {updateStatus === 'error' && (
                <div className="space-y-3">
                  <div className="py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-400">
                      <XCircle size={16} />
                      <span className="text-sm">更新失败，请稍后重试</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    className="w-full py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    重新检查
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className={cn(
            'w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
            saveStatus === 'saved'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
          )}
        >
          {saveStatus === 'saved' ? (
            <>
              <Check size={20} />
              已保存
            </>
          ) : (
            '保存设置'
          )}
        </button>

        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/70">
              <p className="mb-2">💡 使用提示：</p>
              <ul className="space-y-1 text-xs">
                <li>• API Key 仅保存在本地浏览器中，不会上传到服务器</li>
                <li>• 安卓手机推荐使用 Chrome 浏览器以获得最佳语音效果</li>
                <li>• 电脑端建议使用 Edge 或 Chrome 浏览器</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
