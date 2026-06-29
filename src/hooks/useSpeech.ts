import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'

interface UseSpeechReturn {
  isSpeaking: boolean
  isPaused: boolean
  currentSentence: string
  currentSentenceIndex: number
  availableVoices: SpeechSynthesisVoice[]
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
    }

    loadVoices()

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    const timer = setTimeout(loadVoices, 1000)
    const timer2 = setTimeout(loadVoices, 3000)

    return () => {
      window.speechSynthesis.cancel()
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [])

  const speakNext = useCallback(() => {
    if (currentIndexRef.current >= sentencesRef.current.length) {
      setIsSpeaking(false)
      setIsPaused(false)
      return
    }

    const sentence = sentencesRef.current[currentIndexRef.current]
    setCurrentSentence(sentence)
    setCurrentSentenceIndex(currentIndexRef.current)

    const utterance = new SpeechSynthesisUtterance(sentence)
    
    if (settings.voiceName) {
      const voice = availableVoices.find((v) => v.name === settings.voiceName)
      if (voice) utterance.voice = voice
    }
    
    utterance.rate = settings.speechRate
    utterance.pitch = settings.speechPitch
    utterance.volume = settings.speechVolume

    utterance.onend = () => {
      currentIndexRef.current++
      speakNext()
    }

    utterance.onerror = () => {
      currentIndexRef.current++
      speakNext()
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [settings.voiceName, settings.speechRate, settings.speechPitch, settings.speechVolume, availableVoices])

  const speak = useCallback((text: string, startIndex: number = 0) => {
    window.speechSynthesis.cancel()
    
    const sentences = splitSentences(text)
    sentencesRef.current = sentences
    currentIndexRef.current = startIndex
    
    if (sentences.length === 0) return

    setIsSpeaking(true)
    setIsPaused(false)
    speakNext()
  }, [speakNext])

  const speakSentence = useCallback((sentence: string) => {
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(sentence)
    
    if (settings.voiceName) {
      const voice = availableVoices.find((v) => v.name === settings.voiceName)
      if (voice) utterance.voice = voice
    }
    
    utterance.rate = settings.speechRate
    utterance.pitch = settings.speechPitch
    utterance.volume = settings.speechVolume

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utteranceRef.current = utterance
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }, [settings.voiceName, settings.speechRate, settings.speechPitch, settings.speechVolume, availableVoices])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
    setCurrentSentence('')
    setCurrentSentenceIndex(0)
    currentIndexRef.current = 0
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
