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
    }
  }, [])

  const playEdgeTTS = async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(getApiUrl('/api/tts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: settings.voiceName || 'zh-CN-YunxiNeural',
            rate: settings.speechRate,
            pitch: settings.speechPitch,
          })
        })

        if (!response.ok) throw new Error('TTS API Error')

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        if (!audioRef.current) {
          audioRef.current = new Audio()
        }
        
        const audio = audioRef.current
        audio.src = url
        audio.volume = settings.speechVolume
        
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(url)
          const errorMsg = audio.error ? `Code: ${audio.error.code}, Msg: ${audio.error.message}` : '未知播放器错误'
          alert('音频解码/播放失败: ' + errorMsg)
          resolve()
        }
        
        await audio.play()
      } catch (e: any) {
        console.error('TTS Fetch Error', e)
        alert('接口请求失败: ' + e.message)
        resolve()
      }
    })
  }

  const speakNext = useCallback(async () => {
    if (stoppedRef.current) return
    if (pausedRef.current) return

    if (currentIndexRef.current >= sentencesRef.current.length) {
      setIsSpeaking(false)
      setIsPaused(false)
      speakingRef.current = false
      return
    }

    const sentence = sentencesRef.current[currentIndexRef.current]
    setCurrentSentence(sentence)
    setCurrentSentenceIndex(currentIndexRef.current)

    try {
      await playEdgeTTS(sentence)

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
      await playEdgeTTS(sentence)
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
  }, [])

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
