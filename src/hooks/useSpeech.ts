import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

interface VoiceInfo {
  name: string
  lang: string
  default?: boolean
  localService?: boolean
}

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

const isCapacitorNative = Capacitor.isNativePlatform()

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
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([])

  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const speakingRef = useRef(false)
  const pausedRef = useRef(false)
  const stoppedRef = useRef(true)

  useEffect(() => {
    const loadVoices = async () => {
      if (isCapacitorNative) {
        try {
          const result = await TextToSpeech.getSupportedVoices()
          const voices: VoiceInfo[] = (result.voices || []).map((v: any) => ({
            name: v.name,
            lang: v.lang,
            default: v.default,
            localService: v.localService,
          }))
          setAvailableVoices(voices)
        } catch (e) {
          console.error('加载语音列表失败', e)
        }
      } else {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices.map((v) => ({
          name: v.name,
          lang: v.lang,
          default: v.default,
          localService: v.localService,
        })))
      }
    }

    loadVoices()

    if (!isCapacitorNative) {
      const loadWebVoices = () => loadVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadWebVoices
      }
      const timer = setTimeout(loadWebVoices, 1000)
      const timer2 = setTimeout(loadWebVoices, 3000)
      return () => {
        clearTimeout(timer)
        clearTimeout(timer2)
      }
    }
  }, [])

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
      if (isCapacitorNative) {
        const voiceIndex = settings.voiceName
          ? availableVoices.findIndex((v) => v.name === settings.voiceName)
          : -1
        await TextToSpeech.speak({
          text: sentence,
          lang: settings.voiceLang || 'zh-CN',
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          volume: settings.speechVolume,
          ...(voiceIndex >= 0 ? { voice: voiceIndex } : {}),
        })
      } else {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(sentence)
          
          if (settings.voiceName) {
            const voice = window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName)
            if (voice) utterance.voice = voice
          }
          
          utterance.rate = settings.speechRate
          utterance.pitch = settings.speechPitch
          utterance.volume = settings.speechVolume

          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()

          window.speechSynthesis.speak(utterance)
        })
      }

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
  }, [settings.voiceName, settings.voiceLang, settings.speechRate, settings.speechPitch, settings.speechVolume, availableVoices])

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

    stoppedRef.current = false
    pausedRef.current = false
    speakingRef.current = true
    setIsSpeaking(true)
    setIsPaused(false)
    setCurrentSentence(sentence)

    try {
      if (isCapacitorNative) {
        const voiceIndex = settings.voiceName
          ? availableVoices.findIndex((v) => v.name === settings.voiceName)
          : -1
        await TextToSpeech.speak({
          text: sentence,
          lang: settings.voiceLang || 'zh-CN',
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          volume: settings.speechVolume,
          ...(voiceIndex >= 0 ? { voice: voiceIndex } : {}),
        })
      } else {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(sentence)
          
          if (settings.voiceName) {
            const voice = window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName)
            if (voice) utterance.voice = voice
          }
          
          utterance.rate = settings.speechRate
          utterance.pitch = settings.speechPitch
          utterance.volume = settings.speechVolume

          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()

          window.speechSynthesis.speak(utterance)
        })
      }
    } catch (e) {
      console.error('语音播放错误', e)
    } finally {
      if (!stoppedRef.current) {
        setIsSpeaking(false)
        speakingRef.current = false
      }
    }
  }, [settings.voiceName, settings.voiceLang, settings.speechRate, settings.speechPitch, settings.speechVolume, availableVoices])

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
    if (!isCapacitorNative) {
      window.speechSynthesis.pause()
    }
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    setIsPaused(false)
    if (isCapacitorNative) {
      speakNext()
    } else {
      window.speechSynthesis.resume()
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

    if (isCapacitorNative) {
      TextToSpeech.stop().catch(() => {})
    } else {
      window.speechSynthesis.cancel()
    }
  }, [])

  return {
    isSpeaking,
    isPaused,
    currentSentence,
    currentSentenceIndex,
    availableVoices,
    speak,
    pause,
    resume,
    stop,
    speakSentence,
  }
}
