import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { getApiUrl } from '@/utils/apiBase'

interface VoiceInfo {
  name: string
  lang: string
  label: string
}

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
  speak: (text: string, startIndex?: number) => void
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

  const clearAudioCache = useCallback(() => {
    audioCacheRef.current.forEach(url => {
      if (url) URL.revokeObjectURL(url)
    })
    audioCacheRef.current.clear()
    prefetchingRef.current.clear()
  }, [])

  useEffect(() => {
    // 移动端 Safari/Chrome 必须由用户手势触发一次播放，才能在后续异步操作中自动播放
    const unlockAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      // 播放一段极短的静音 base64 mp3
      audioRef.current.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
      audioRef.current.play().catch(() => {})
      
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('click', unlockAudio)
    }

    document.addEventListener('touchstart', unlockAudio, { once: true })
    document.addEventListener('click', unlockAudio, { once: true })

    return () => {
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('click', unlockAudio)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      clearAudioCache()
    }
  }, [clearAudioCache])

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
      speakNext()
    } catch (e) {
      console.error('语音播放错误', e)
      if (stoppedRef.current) return
      currentIndexRef.current++
      speakNext()
    }
  }, [settings.voiceName, settings.speechRate, settings.speechPitch, settings.speechVolume])

  const speak = useCallback(async (text: string, startIndex: number = 0) => {
    stop()

    const sentences = splitSentences(text)
    sentencesRef.current = sentences
    currentIndexRef.current = startIndex

    if (sentences.length === 0) return

    stoppedRef.current = false
    pausedRef.current = false
    speakingRef.current = true
    setIsSpeaking(true)
    setIsPaused(false)

    speakNext()
  }, [speakNext])

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
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    setIsPaused(false)
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(() => speakNext())
    } else {
      speakNext()
    }
  }, [speakNext])

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
    clearAudioCache()
  }, [clearAudioCache])

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
