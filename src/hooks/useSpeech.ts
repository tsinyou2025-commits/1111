import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { getApiUrl } from '@/utils/apiBase'

interface VoiceInfo {
  name: string
  lang: string
  label: string
}

// iOS 平台检测（用于 silent audio trick 保持后台播放）
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const EDGE_VOICES: VoiceInfo[] = [
  { name: 'zh-CN-YunxiNeural', lang: 'zh-CN', label: '云希 - 磁性男声 (推荐)' },
  { name: 'zh-CN-YunyeNeural', lang: 'zh-CN', label: '云野 - 沉稳男声' },
  { name: 'zh-CN-XiaoxiaoNeural', lang: 'zh-CN', label: '晓晓 - 温柔女声' },
  { name: 'zh-CN-XiaoyiNeural', lang: 'zh-CN', label: '晓伊 - 亲切女声' },
  { name: 'zh-CN-YunjianNeural', lang: 'zh-CN', label: '云健 - 影视解说男声' },
]

interface UseSpeechReturn {
  isSpeaking: boolean
  isPaused: boolean
  currentSentence: string
  currentSentenceIndex: number
  availableVoices: VoiceInfo[]
  speak: (text: string, startIndex?: number, meta?: { storyTitle?: string; chapterTitle?: string }) => void
  pause: () => void
  resume: () => void
  stop: () => void
  speakSentence: (sentence: string) => void
}

function splitSentences(text: string): string[] {
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text]
  return sentences.filter((s) => s.trim().length > 0)
}

function cleanSentence(text: string): string {
  return text.replace(/[*#_~`]/g, '')
}

export function useSpeech(): UseSpeechReturn {
  const { settings } = useAppStore()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSentence, setCurrentSentence] = useState('')
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)

  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const speakingRef = useRef(false)
  const pausedRef = useRef(false)
  const stoppedRef = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCacheRef = useRef<Map<number, string>>(new Map())
  const prefetchingRef = useRef<Set<number>>(new Set())
  // === 后台保活相关 ===
  const wakeLockRef = useRef<any>(null)
  const keepaliveRef = useRef<number | null>(null)
  const requestWakeLockRef = useRef<(() => Promise<void>) | null>(null)
  const releaseWakeLockRef = useRef<(() => Promise<void>) | null>(null)
  const chapterTitleRef = useRef<string>('')
  const storyTitleRef = useRef<string>('')
  // iOS 后台保活：silent audio loop 保持 audio session 不被系统回收
  const silentAudioRef = useRef<HTMLAudioElement | null>(null)

  const clearAudioCache = useCallback(() => {
    audioCacheRef.current.forEach(url => {
      if (url) URL.revokeObjectURL(url)
    })
    audioCacheRef.current.clear()
    prefetchingRef.current.clear()
  }, [])

  // 用 ref 解开 speakNext 的循环依赖：checkPlaybackHealth 在 useEffect 中通过 ref 调用
  const speakNextRef = useRef<(() => Promise<void>) | null>(null)

  // 检测链条是否断裂：5 秒一次，如果「应该播放」但音频没在播，则重启
  const checkPlaybackHealth = () => {
    if (stoppedRef.current) return
    if (pausedRef.current) return
    if (!speakingRef.current) return
    if (currentIndexRef.current >= sentencesRef.current.length) return

    const audio = audioRef.current
    // audio 元素存在但 paused=true 且 ended=true（idle 状态）→ onended 没触发，链条断了
    if (!audio || audio.paused || audio.ended) {
      console.warn('[Keepalive] 检测到播放链条断裂，强制恢复')
      speakNextRef.current?.()
    }
  }

  useEffect(() => {
    // 移动端 Safari/Chrome 必须由用户手势触发一次播放，才能在后续异步操作中自动播放
    const unlockAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      // 播放一段极短的静音 base64 mp3
      audioRef.current.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
      audioRef.current.play().catch(() => {})

      // iOS PWA: 确保内联播放不被拦截
      audioRef.current.setAttribute('playsinline', '')

      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('touchend', unlockAudio)
      document.removeEventListener('click', unlockAudio)
    }

    // iOS PWA 模式下 touchend 比 touchstart 更可靠
    document.addEventListener('touchstart', unlockAudio, { once: true })
    document.addEventListener('touchend', unlockAudio, { once: true })
    document.addEventListener('click', unlockAudio, { once: true })

    // === MediaSession 注册：让 Android 把本应用当成媒体会话，加入锁屏控制并降低后台回收概率 ===
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: chapterTitleRef.current || '长夜故事',
          artist: storyTitleRef.current || 'AI 助眠',
          album: '长夜故事',
        })
        navigator.mediaSession.setActionHandler('play', () => {
          pausedRef.current = false
          setIsPaused(false)
          if (audioRef.current && audioRef.current.src) {
            audioRef.current.play().catch(() => speakNextRef.current?.())
          } else {
            speakNextRef.current?.()
          }
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          pausedRef.current = true
          setIsPaused(true)
          if (audioRef.current) audioRef.current.pause()
        })
        navigator.mediaSession.setActionHandler('seekbackward', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
      } catch (e) {
        console.warn('[MediaSession] 初始化失败', e)
      }
    }

    // === 页面从后台回到前台时，若应播却没播，重启链条 ===
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!stoppedRef.current && !pausedRef.current && speakingRef.current) {
          // 重新申请 wake lock（页面在后台时可能被系统释放）
          requestWakeLockRef.current?.()
          // 检测并恢复
          const audio = audioRef.current
          if (!audio || audio.paused || audio.ended) {
            console.warn('[Visibility] 回到前台，音频已停，重启链条')
            speakNextRef.current?.()
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // === keepalive 兜底：每 5 秒检查一次播放是否卡住 ===
    keepaliveRef.current = window.setInterval(checkPlaybackHealth, 5000)

    return () => {
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('touchend', unlockAudio)
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (keepaliveRef.current !== null) {
        clearInterval(keepaliveRef.current)
        keepaliveRef.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (silentAudioRef.current) {
        try { silentAudioRef.current.pause(); silentAudioRef.current.src = '' } catch {}
        silentAudioRef.current = null
      }
      releaseWakeLockRef.current?.()
      clearAudioCache()
    }
  }, [clearAudioCache])

  // === Wake Lock 申请/释放：防止屏幕休眠时 Doze 模式冻住 JS ===
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) return
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      wakeLockRef.current.addEventListener('release', () => {
        // wake lock 被系统释放（屏幕关/页面切后台等），无需处理
      })
    } catch (e) {
      console.warn('[WakeLock] 申请失败', e)
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release() } catch {}
      wakeLockRef.current = null
    }
  }, [])

  // === iOS 后台保活：播放静音音频保持 audio session ===
  // iOS Safari/PWA 会在锁屏或切后台时暂停 audio session
  // 播放一个循环静音 MP3 可以保持 session 存活，让 Edge TTS 音频能继续播放
  const startSilentAudio = useCallback(() => {
    if (!isIOS) return
    if (silentAudioRef.current) return
    try {
      silentAudioRef.current = new Audio()
      // 极短的静音 MP3 (约 0.1 秒)
      silentAudioRef.current.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
      silentAudioRef.current.loop = true
      silentAudioRef.current.volume = 0.01
      silentAudioRef.current.setAttribute('playsinline', '')
      silentAudioRef.current.play().catch(() => {})
    } catch {}
  }, [])

  const stopSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      try {
        silentAudioRef.current.pause()
        silentAudioRef.current.src = ''
      } catch {}
      silentAudioRef.current = null
    }
  }, [])

  const fetchTTS = async (text: string, retries = 2): Promise<string> => {
    return new Promise(async (resolve) => {
      const attempt = async (retriesLeft: number) => {
        try {
          const cleanedText = cleanSentence(text)
          if (!cleanedText.trim()) {
            return resolve('')
          }

          const response = await fetch(getApiUrl('/api/tts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanedText,
              voice: settings.voiceName || 'zh-CN-YunxiNeural',
              rate: settings.speechRate,
              pitch: settings.speechPitch,
            })
          })

          if (!response.ok) throw new Error(`TTS API Error ${response.status}`)

          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          resolve(url)
        } catch (e: any) {
          if (retriesLeft > 0) {
            await new Promise(r => setTimeout(r, 2000))
            await attempt(retriesLeft - 1)
          } else {
            console.warn('[TTS] 跳过句子（重试耗尽）:', text.slice(0, 20))
            resolve('')
          }
        }
      }
      await attempt(retries)
    })
  }

  const playAudio = async (url: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!url) {
        return resolve()
      }
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current
      audio.src = url
      audio.volume = settings.speechVolume

      audio.onended = () => resolve()
      audio.onerror = () => resolve()

      audio.play().catch(() => resolve())
    })
  }

  const speakNext = useCallback(async () => {
    if (stoppedRef.current) return
    if (pausedRef.current) return

    const currentIndex = currentIndexRef.current
    if (currentIndex >= sentencesRef.current.length) {
      setIsSpeaking(false)
      setIsPaused(false)
      speakingRef.current = false
      return
    }

    const sentence = sentencesRef.current[currentIndex]
    setCurrentSentence(sentence)
    setCurrentSentenceIndex(currentIndex)

    try {
      let url = audioCacheRef.current.get(currentIndex)
      if (url === undefined) {
        url = await fetchTTS(sentence)
        audioCacheRef.current.set(currentIndex, url)
      }

      // 预加载下一句
      const nextIndex = currentIndex + 1
      if (nextIndex < sentencesRef.current.length && !audioCacheRef.current.has(nextIndex) && !prefetchingRef.current.has(nextIndex)) {
        prefetchingRef.current.add(nextIndex)
        fetchTTS(sentencesRef.current[nextIndex]).then(nextUrl => {
          audioCacheRef.current.set(nextIndex, nextUrl)
          prefetchingRef.current.delete(nextIndex)
        }).catch(() => {
          prefetchingRef.current.delete(nextIndex)
        })
      }

      if (stoppedRef.current) return
      if (pausedRef.current) return

      await playAudio(url)

      // 播放完成后清理当前 URL
      if (url) URL.revokeObjectURL(url)
      audioCacheRef.current.delete(currentIndex)

      if (stoppedRef.current) return
      if (pausedRef.current) return

      currentIndexRef.current++
      speakNextRef.current?.()
    } catch (e) {
      console.error('语音播放错误', e)
      if (stoppedRef.current) return
      currentIndexRef.current++
      speakNextRef.current?.()
    }
  }, [settings.voiceName, settings.speechRate, settings.speechPitch, settings.speechVolume])

  // 把 speakNext 的最新引用挂到 ref，供 keepalive / visibility 回调使用
  speakNextRef.current = speakNext

  const speak = useCallback(async (text: string, startIndex: number = 0, meta?: { storyTitle?: string; chapterTitle?: string }) => {
    stop()

    const sentences = splitSentences(text)
    sentencesRef.current = sentences
    currentIndexRef.current = startIndex

    if (sentences.length === 0) return

    // 更新 MediaSession 元数据 + 标题缓存
    if (meta?.chapterTitle) chapterTitleRef.current = meta.chapterTitle
    if (meta?.storyTitle) storyTitleRef.current = meta.storyTitle
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: chapterTitleRef.current || '长夜故事',
          artist: storyTitleRef.current || 'AI 助眠',
          album: '长夜故事',
        })
        navigator.mediaSession.playbackState = 'playing'
      } catch {}
    }

    // 申请屏幕 wake lock，防止 Doze 模式冻结
    requestWakeLock()

    // iOS 后台保活：启动静音音频循环
    startSilentAudio()

    stoppedRef.current = false
    pausedRef.current = false
    speakingRef.current = true
    setIsSpeaking(true)
    setIsPaused(false)

    speakNext()
  }, [speakNext, requestWakeLock, startSilentAudio])

  const speakSentence = useCallback(async (sentence: string) => {
    stop()

    setIsSpeaking(true)
    setIsPaused(false)
    setCurrentSentence(sentence)

    try {
      const url = await fetchTTS(sentence)
      await playAudio(url)
      if (url) URL.revokeObjectURL(url)
    } catch (e) {
      console.error('语音播放错误', e)
    } finally {
      if (!stoppedRef.current) {
        setIsSpeaking(false)
        speakingRef.current = false
      }
    }
  }, [settings.voiceName, settings.speechRate, settings.speechPitch, settings.speechVolume])

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused' } catch {}
    }
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    setIsPaused(false)
    requestWakeLock()
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'playing' } catch {}
    }
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(() => speakNext())
    } else {
      speakNext()
    }
  }, [speakNext, requestWakeLock])

  const stop = useCallback(() => {
    stoppedRef.current = true
    pausedRef.current = false
    speakingRef.current = false
    setIsSpeaking(false)
    setIsPaused(false)
    setCurrentSentence('')
    setCurrentSentenceIndex(0)
    currentIndexRef.current = 0

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'none' } catch {}
    }
    releaseWakeLock()
    stopSilentAudio()
    clearAudioCache()
  }, [clearAudioCache, releaseWakeLock, stopSilentAudio])

  return {
    isSpeaking,
    isPaused,
    currentSentence,
    currentSentenceIndex,
    availableVoices: EDGE_VOICES,
    speak,
    pause,
    resume,
    stop,
    speakSentence,
  }
}
