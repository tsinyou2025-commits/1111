import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Timer,
  Volume2,
  Gauge,
  X,
  Loader2,
  Home,
  List,
  LocateFixed,
  CheckCircle2,
  Circle,
  RefreshCw,
  Download,
  Edit3,
  PlusCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useSpeech } from '@/hooks/useSpeech'
import { buildChapterPrompt } from '../../shared/storyLogic'
import { useStoryGenerator } from '@/hooks/useStoryGenerator'
import { cn } from '@/lib/utils'

const timerOptions = [
  { minutes: 0, label: '不计时' },
  { minutes: 15, label: '15分钟' },
  { minutes: 30, label: '30分钟' },
  { minutes: 60, label: '1小时' },
  { minutes: 120, label: '2小时' },
]

export default function Player() {
  const navigate = useNavigate()
  const location = useLocation()
  const isVisible = location.pathname === '/player'
  const { currentStory, settings, addToHistory, setCurrentStory, updateChapter } = useAppStore()
  const { isSpeaking, isPaused, speak, pause, resume, stop, currentSentence, currentSentenceIndex: speechSentenceIndex, availableVoices, setOnChapterEnd } = useSpeech()
  const { isGenerating, isGeneratingOutline, error, generateChapter, stopGenerating, startBatchGeneration, stopBatchGeneration, expandChapter, rewriteParagraph, generateCustomChapter } = useStoryGenerator()
  const generateChapterRef = useRef(generateChapter)
  generateChapterRef.current = generateChapter

  const textContainerRef = useRef<HTMLDivElement>(null)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [showVolumeMenu, setShowVolumeMenu] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [contextMenuIdx, setContextMenuIdx] = useState<number | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewingChapterIndex, setViewingChapterIndex] = useState(currentStory.currentChapterIndex)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [localVolume, setLocalVolume] = useState(settings.speechVolume)
  const [localRate, setLocalRate] = useState(settings.speechRate)
  const speedOptions = [0.75, 0.85, 1, 1.25, 1.5, 2]
  const timerRef = useRef<number | null>(null)
  const startedStoryIdRef = useRef<string | null>(null)
  const autoGeneratingRef = useRef(false)
  const speakingChapterRef = useRef<number>(-1)
  const justStartedSpeakingRef = useRef(false)
  const scrollLockRef = useRef(false)
  const userScrolledRef = useRef(false)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentStoryRef = useRef(currentStory)
  currentStoryRef.current = currentStory
  const [scrolledAway, setScrolledAway] = useState(false)
  const needsInitialScroll = useRef(true)
  const [miniPlayerCollapsed, setMiniPlayerCollapsed] = useState(false)
  const miniPlayerTouchStartX = useRef<number | null>(null)
  
  // 新增功能的 state
  const [expandModalIdx, setExpandModalIdx] = useState<number | null>(null)
  const [expandForm, setExpandForm] = useState({ words: 1000, prompt: '' })
  const [renameModalIdx, setRenameModalIdx] = useState<number | null>(null)
  const [renameFormTitle, setRenameFormTitle] = useState('')
  const [rewriteModal, setRewriteModal] = useState<{ chapterIdx: number, pIdx: number, text: string } | null>(null)
  const [rewriteReqs, setRewriteReqs] = useState('')
  const [regenerateModalIdx, setRegenerateModalIdx] = useState<number | null>(null)
  const [regeneratePrompt, setRegeneratePrompt] = useState('')
  const paragraphLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playingChapter = currentStory.chapters[currentStory.currentChapterIndex]
  const viewingChapter = currentStory.chapters[viewingChapterIndex]
  const completedChapters = currentStory.chapters.filter((c) => c.status === 'completed').length

  // 拆分段落和句子用于高亮显示
  const paragraphs = viewingChapter?.content
    ? viewingChapter.content.split(/\n\n+/).filter(p => p.trim())
    : []
  const paragraphsAndSentences = paragraphs.map(para => ({
    text: para,
    sentences: para.match(/[^\u3002\uff01\uff1f!?]+[\u3002\uff01\uff1f!?]+/g) || [para],
  }))

  // 当后台播放章节自动切换时，如果用户没有在浏览其他章节，则自动跟随
  useEffect(() => {
    if (autoGeneratingRef.current && viewingChapterIndex !== currentStory.currentChapterIndex) {
       setViewingChapterIndex(currentStory.currentChapterIndex)
    }
  }, [currentStory.currentChapterIndex, viewingChapterIndex])

  useEffect(() => {
    if (!currentStory.theme || !currentStory.id) {
      // 不再强制跳转，显示空状态即可
    }
  }, [currentStory.theme, currentStory.id])

  // 播放位置持久化：实时保存当前句子索引到 store
  useEffect(() => {
    if (isSpeaking && speechSentenceIndex >= 0) {
      setCurrentStory({ currentSentenceIndex: speechSentenceIndex })
    }
  }, [speechSentenceIndex, isSpeaking, setCurrentStory])

  // 故事切换时：重置状态，生成第一章
  useEffect(() => {
    if (!currentStory.id) return
    if (currentStory.chapters.length === 0) return
    if (startedStoryIdRef.current === currentStory.id) return
    if (isGenerating) return

    startedStoryIdRef.current = currentStory.id
    speakingChapterRef.current = -1

    const firstChapter = currentStory.chapters[0]
    if (firstChapter?.status === 'pending') {
      generateChapter(0)
    } else if (firstChapter?.status === 'completed' && firstChapter.content) {
      // 恢复的故事，不自动播放，用户手动按播放
    }
  }, [currentStory.id, currentStory.chapters.length, isGenerating, generateChapter, speak, setCurrentStory])

  // 当前章节生成完成且在播放状态 → 开始播放
  useEffect(() => {
    if (!playingChapter) return
    if (playingChapter.status !== 'completed') return
    if (!playingChapter.content) return
    if (isSpeaking || isPaused) return
    if (speakingChapterRef.current === currentStory.currentChapterIndex) return

    if (currentStory.isPlaying) {
      justStartedSpeakingRef.current = true
      speak(playingChapter.content, currentStory.currentSentenceIndex || 0, { storyTitle: currentStory.title, chapterTitle: playingChapter.title })
      speakingChapterRef.current = currentStory.currentChapterIndex
    }
  }, [playingChapter?.status, playingChapter?.content, currentStory.currentChapterIndex, currentStory.isPlaying, isSpeaking, isPaused, speak])

  // 当前章播放结束 → 直接回调跳下一章（不依赖 state 变化时序）
  useEffect(() => {
    const handleChapterEnd = () => {
      // 直接从 store 读最新状态，避免闭包捕获旧引用
      const store = useAppStore.getState()
      const story = store.currentStory
      if (!story.isPlaying) return
      if (autoGeneratingRef.current) return

      const nextIdx = story.currentChapterIndex + 1
      if (nextIdx >= story.chapters.length) {
        store.setCurrentStory({ isPlaying: false })
        return
      }

      const nextChapter = story.chapters[nextIdx]
      if (!nextChapter) return

      autoGeneratingRef.current = true

      if (nextChapter.status === 'completed') {
        store.setCurrentStory({ currentChapterIndex: nextIdx, currentSentenceIndex: 0 })
        setViewingChapterIndex(nextIdx)
        autoGeneratingRef.current = false
      } else if (nextChapter.status === 'pending') {
        store.setCurrentStory({ currentChapterIndex: nextIdx, currentSentenceIndex: 0 })
        setViewingChapterIndex(nextIdx)
        generateChapterRef.current?.(nextIdx)?.finally?.(() => {
          autoGeneratingRef.current = false
        })
      } else {
        // 正在生成中，直接切换过去等待
        store.setCurrentStory({ currentChapterIndex: nextIdx, currentSentenceIndex: 0 })
        setViewingChapterIndex(nextIdx)
        autoGeneratingRef.current = false
      }
    }
    setOnChapterEnd(handleChapterEnd)
    return () => setOnChapterEnd(null)
  }, [setOnChapterEnd])

  // 预生成下一章：当当前章正在播放且空闲时，提前在后台生成下一章
  useEffect(() => {
    if (!currentStory.isPlaying) return
    if (isGenerating) return
    if (!playingChapter || playingChapter.status !== 'completed') return

    const nextIdx = currentStory.currentChapterIndex + 1
    if (nextIdx < currentStory.chapters.length) {
      const nextChapter = currentStory.chapters[nextIdx]
      if (nextChapter.status === 'pending') {
        generateChapter(nextIdx)
      }
    }
  }, [currentStory.isPlaying, isGenerating, playingChapter?.status, currentStory.currentChapterIndex, currentStory.chapters.length, generateChapter])

  // 兜底逻辑：如果当前需要播放的章节是 pending，且当前系统处于空闲，则必须生成它
  // 这可以解决用户手动干预导致自动跳章未能成功触发生成的问题
  useEffect(() => {
    if (!currentStory.isPlaying) return
    if (isGenerating) return
    if (!playingChapter) return
    
    if (playingChapter.status === 'pending') {
      generateChapter(currentStory.currentChapterIndex)
    }
  }, [currentStory.isPlaying, isGenerating, playingChapter?.status, currentStory.currentChapterIndex, generateChapter])

  // 清理 justStartedSpeakingRef 标记
  useEffect(() => {
    if (isSpeaking) {
      justStartedSpeakingRef.current = false
    }
  }, [isSpeaking])

  // 滚动到当前播放句子的通用函数（用户触发定位时用 instant，秒到）
  const scrollToCurrentSentence = useCallback(() => {
    setTimeout(() => {
      const el = document.querySelector('[data-sentence-active="true"]')
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' })
        setScrolledAway(false)
      }
    }, 50)
  }, [])

  // 进入播放页时首次滚动到当前播放位置
  useEffect(() => {
    if (!needsInitialScroll.current) return
    if (!currentSentence) return
    if (!isVisible) return
    needsInitialScroll.current = false
    scrollToCurrentSentence()
  }, [currentSentence, isVisible, scrollToCurrentSentence])

  // 检测用户是否手动滚动离开了当前句子
  useEffect(() => {
    const container = textContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const activeEl = document.querySelector('[data-sentence-active="true"]')
      if (!activeEl) return
      const rect = activeEl.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const isInView = rect.top >= containerRect.top && rect.bottom <= containerRect.bottom
      setScrolledAway(!isInView)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isSpeaking])

  // 用户手动滚动后，暂停自动聚焦 11 秒
  useEffect(() => {
    const container = textContainerRef.current
    if (!container) return
    const handleUserScroll = () => {
      if (!isSpeaking) return
      userScrolledRef.current = true
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
      scrollResumeTimerRef.current = setTimeout(() => {
        userScrolledRef.current = false
      }, 11000)
    }
    container.addEventListener('scroll', handleUserScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleUserScroll)
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
    }
  }, [isSpeaking])

  // 滚动到当前句子（生成中不滚动，避免鬼畜；用户手动滚动后等 11 秒再恢复）
  useEffect(() => {
    if (!currentSentence) return
    if (isGenerating) return
    if (scrollLockRef.current) return
    if (userScrolledRef.current) return

    scrollLockRef.current = true
    const timer = setTimeout(() => {
      scrollLockRef.current = false
    }, 150)

    const el = document.querySelector('[data-sentence-active="true"]')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return () => clearTimeout(timer)
  }, [currentSentence, isGenerating])

  useEffect(() => {
    if (timerMinutes > 0) {
      setTimerRemaining(timerMinutes * 60)
    } else {
      setTimerRemaining(0)
    }
  }, [timerMinutes])

  useEffect(() => {
    if (timerRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            stop()
            pause()
            setCurrentStory({ isPlaying: false })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timerRemaining > 0])

  useEffect(() => {
    if (currentStory.id && currentStory.chapters.length > 0) {
      addToHistory({
        id: currentStory.id,
        theme: currentStory.theme,
        style: currentStory.style,
        targetHours: currentStory.targetHours,
        createdAt: parseInt(currentStory.id),
        chapters: currentStory.chapters,
        totalWords: currentStory.totalWords,
        currentChapterIndex: currentStory.currentChapterIndex,
        currentSentenceIndex: currentStory.currentSentenceIndex,
      })
    }
  }, [currentStory.id, currentStory.chapters.length, completedChapters])

  const handlePlayPause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      pause()
      setCurrentStory({ isPlaying: false })
    } else if (isPaused) {
      resume()
      setCurrentStory({ isPlaying: true })
    } else if (playingChapter?.status === 'completed' && playingChapter.content) {
      justStartedSpeakingRef.current = true
      speak(playingChapter.content, currentStory.currentSentenceIndex || 0, { storyTitle: currentStory.title, chapterTitle: playingChapter.title })
      speakingChapterRef.current = currentStory.currentChapterIndex
      setCurrentStory({ isPlaying: true })
    }
  }, [isSpeaking, isPaused, playingChapter, currentStory.currentChapterIndex, currentStory.currentSentenceIndex, speak, pause, resume, setCurrentStory])

  const handlePrevChapter = () => {
    if (currentStory.currentChapterIndex > 0) {
      const prevIdx = currentStory.currentChapterIndex - 1
      const prevChapter = currentStory.chapters[prevIdx]
      if (prevChapter?.status === 'completed') {
        stop()
        setCurrentStory({ currentChapterIndex: prevIdx, isPlaying: true, currentSentenceIndex: 0 })
        setViewingChapterIndex(prevIdx)
        speakingChapterRef.current = prevIdx
        justStartedSpeakingRef.current = true
        setTimeout(() => {
          speak(prevChapter.content)
        }, 100)
      }
    }
  }

  const handleNextChapter = () => {
    const nextIdx = currentStory.currentChapterIndex + 1
    const nextChapter = currentStory.chapters[nextIdx]
    if (nextChapter) {
      if (nextChapter.status === 'completed') {
        stop()
        setCurrentStory({ currentChapterIndex: nextIdx, isPlaying: true, currentSentenceIndex: 0 })
        setViewingChapterIndex(nextIdx)
        speakingChapterRef.current = nextIdx
        justStartedSpeakingRef.current = true
        setTimeout(() => {
          speak(nextChapter.content)
        }, 100)
      } else if (nextChapter.status === 'pending') {
        setCurrentStory({ currentChapterIndex: nextIdx, isPlaying: true, currentSentenceIndex: 0 })
        setViewingChapterIndex(nextIdx)
        generateChapter(nextIdx)
      }
    }
  }

  const handleJumpToChapter = (index: number) => {
    setViewingChapterIndex(index)
    setShowChapters(false)
  }

  const handleRegenerateChapter = (idx: number) => {
    const chapter = currentStory.chapters[idx]
    if (!chapter) return
    const prevChapter = idx > 0 ? currentStory.chapters[idx - 1] : null
    const reqBody = {
      theme: currentStory.theme,
      style: currentStory.style,
      customStylePrompt: currentStory.customStylePrompt,
      targetHours: currentStory.targetHours,
      chapterIndex: idx,
      chapterTitle: chapter?.title,
      totalChapters: currentStory.chapters.length,
      previousSummary: prevChapter?.summary,
      previousEnding: prevChapter?.content?.slice(-300),
      aiBaseUrl: settings.aiBaseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
    }
    const defaultPrompt = buildChapterPrompt(reqBody)
    setRegeneratePrompt(defaultPrompt)
    setRegenerateModalIdx(idx)
    setContextMenuIdx(null)
  }

  const handleRegenerateSubmit = async () => {
    if (regenerateModalIdx === null) return
    const idx = regenerateModalIdx
    setRegenerateModalIdx(null)
    updateChapter(idx, { status: 'pending' })
    await generateCustomChapter(idx, regeneratePrompt)
  }

  // 长按/右键事件处理
  const handleChapterPointerDown = (idx: number, e: React.PointerEvent) => {
    // 只响应左键或触摸
    if (e.button !== 0) return
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuIdx(idx)
    }, 500)
  }
  const handleChapterPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }
  const handleChapterContextMenu = (idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuIdx(idx)
  }

  // 点击目录条目：直接切换播放
  const handleSwitchAndPlayChapter = (index: number) => {
    const chapter = currentStory.chapters[index]
    if (!chapter) return
    setShowChapters(false)
    setViewingChapterIndex(index)
    if (chapter.status === 'completed' && chapter.content) {
      stop()
      setCurrentStory({ currentChapterIndex: index, isPlaying: true, currentSentenceIndex: 0 })
      speakingChapterRef.current = index
      justStartedSpeakingRef.current = true
      setTimeout(() => speak(chapter.content), 100)
    } else if (chapter.status === 'pending') {
      stop()
      setCurrentStory({ currentChapterIndex: index, isPlaying: true, currentSentenceIndex: 0 })
      generateChapter(index)
    }
  }

  const handleRetryChapter = () => {
    if (viewingChapter) {
      generateChapter(viewingChapterIndex)
    }
  }

  const playViewingChapter = () => {
    const chapter = currentStory.chapters[viewingChapterIndex]
    if (!chapter) return

    stop()

    if (chapter.status === 'completed') {
      setCurrentStory({ currentChapterIndex: viewingChapterIndex, isPlaying: true, currentSentenceIndex: 0 })
      speakingChapterRef.current = viewingChapterIndex
      justStartedSpeakingRef.current = true
      setTimeout(() => {
        speak(chapter.content)
      }, 100)
    } else if (chapter.status === 'pending') {
      setCurrentStory({ currentChapterIndex: viewingChapterIndex, isPlaying: true, currentSentenceIndex: 0 })
      generateChapter(viewingChapterIndex)
    }
  }

  const handleParagraphPointerDown = (chapterIdx: number, pIdx: number, text: string, e: React.PointerEvent) => {
    paragraphLongPressTimerRef.current = setTimeout(() => {
      setRewriteModal({ chapterIdx, pIdx, text })
      setRewriteReqs('')
      paragraphLongPressTimerRef.current = null
    }, 500)
  }

  const handleParagraphPointerUp = () => {
    if (paragraphLongPressTimerRef.current) {
      clearTimeout(paragraphLongPressTimerRef.current)
      paragraphLongPressTimerRef.current = null
    }
  }

  const handleExpandSubmit = async () => {
    if (expandModalIdx === null) return
    const chapter = currentStory.chapters[expandModalIdx]
    setExpandModalIdx(null)
    updateChapter(expandModalIdx, { status: 'pending' })
    await generateCustomChapter(expandModalIdx, expandForm.prompt)
  }

  const handleRewriteSubmit = async () => {
    if (!rewriteModal) return
    const { chapterIdx, pIdx, text } = rewriteModal
    setRewriteModal(null)
    await rewriteParagraph(chapterIdx, pIdx, text, rewriteReqs)
  }

  const handleRenameSubmit = () => {
    if (renameModalIdx === null) return
    if (renameFormTitle.trim()) {
      updateChapter(renameModalIdx, { title: renameFormTitle.trim() })
    }
    setRenameModalIdx(null)
    setContextMenuIdx(null)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const estimatedDuration = currentStory.totalWords / (settings.speechRate * 200 / 60)

  const getChapterStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
      case 'generating':
        return <Loader2 size={16} className="text-amber-400 animate-spin flex-shrink-0" />
      default:
        return <Circle size={16} className="text-slate-600 flex-shrink-0" />
    }
  }

  if (!isVisible) {
    if (!currentStory.id || !playingChapter) return null
    return (
      <div 
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out flex",
          miniPlayerCollapsed 
            ? "bottom-[80px] right-0 translate-x-0" 
            : "bottom-[80px] left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-96"
        )}
      >
        {miniPlayerCollapsed ? (
          <div 
            onClick={() => setMiniPlayerCollapsed(false)}
            className="bg-slate-800/95 backdrop-blur-xl border border-r-0 border-slate-700/50 rounded-l-full p-1 pl-2 shadow-2xl flex items-center gap-2 cursor-pointer active:scale-95 touch-pan-y"
            onTouchStart={(e) => { miniPlayerTouchStartX.current = e.touches[0].clientX }}
            onTouchMove={(e) => {
              if (miniPlayerTouchStartX.current !== null) {
                const diff = miniPlayerTouchStartX.current - e.touches[0].clientX
                if (diff > 30) {
                  setMiniPlayerCollapsed(false)
                  miniPlayerTouchStartX.current = null
                }
              }
            }}
            onTouchEnd={() => { miniPlayerTouchStartX.current = null }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center relative shadow-lg">
              {isSpeaking && !isPaused ? (
                <div className="flex gap-0.5 items-center justify-center">
                  <div className="w-1 h-3 bg-slate-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-4 bg-slate-900 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                  <div className="w-1 h-3 bg-slate-900 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                </div>
              ) : (
                <Play size={16} fill="currentColor" className="text-slate-900 ml-0.5" />
              )}
            </div>
          </div>
        ) : (
          <div 
            className="flex-1 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl flex items-center gap-3 touch-pan-y"
            onTouchStart={(e) => { miniPlayerTouchStartX.current = e.touches[0].clientX }}
            onTouchMove={(e) => {
              if (miniPlayerTouchStartX.current !== null) {
                const diff = e.touches[0].clientX - miniPlayerTouchStartX.current
                if (diff > 50) {
                  setMiniPlayerCollapsed(true)
                  miniPlayerTouchStartX.current = null
                }
              }
            }}
            onTouchEnd={() => { miniPlayerTouchStartX.current = null }}
          >
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate('/player')}
            >
              <div className="text-xs text-amber-400 mb-1 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                后台播放中 <span className="text-slate-500 ml-1 scale-90 font-normal">({(isSpeaking && !isPaused) ? '右滑可收起' : '右滑可收起'})</span>
              </div>
              <div className="text-sm text-slate-200 font-medium truncate">
                {playingChapter.title}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {currentStory.title || currentStory.theme}
              </div>
            </div>
            <button
              onClick={() => {
                const currentIdx = speedOptions.indexOf(settings.speechRate)
                const nextIdx = (currentIdx + 1) % speedOptions.length
                const newRate = speedOptions[nextIdx]
                setLocalRate(newRate)
                useAppStore.getState().setSettings({ speechRate: newRate })
              }}
              className="h-9 px-2.5 flex-shrink-0 rounded-lg bg-slate-700/80 text-slate-300 text-xs font-bold flex items-center justify-center active:scale-95 transition-all"
            >
              {settings.speechRate}x
            </button>
            <button
              onClick={handlePlayPause}
              disabled={playingChapter?.status !== 'completed' || !playingChapter?.content}
              className="w-11 h-11 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {isGenerating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isSpeaking && !isPaused ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // === 空状态：没有故事内容 ===
  if (!currentStory.id || !currentStory.chapters.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <List size={32} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-medium text-slate-300 mb-3">还没有内容</h2>
          <p className="text-slate-500 mb-8">请先生成故事内容，然后就可以开始播放了</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Home size={18} />
            去生成故事
          </button>
        </div>
      </div>
    )
  }

  const exportToTxt = () => {
    let text = `${currentStory.title || currentStory.theme}\n\n`
    currentStory.chapters.forEach(c => {
      text += `=== ${c.title} ===\n\n`
      if (c.content) {
        text += `${c.content}\n\n`
      } else {
        text += `[本章尚未生成]\n\n`
      }
    })
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentStory.title || currentStory.theme || '导出故事'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Background Pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[40%] rounded-full bg-orange-500/5 blur-[100px]" />
      </div>

      {/* Global Generation Queue Banner */}
      {currentStory.isGenerating && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-indigo-500/90 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <Loader2 size={14} className="animate-spin" />
          <span>正在生成: 第 {currentStory.chapters.findIndex(c => c.status === 'generating') + 1} 章</span>
          {currentStory.generationQueue?.length > 0 && (
            <span className="opacity-80"> (队列等待: {currentStory.generationQueue.length}章)</span>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={cn("relative z-10 flex flex-col h-full", currentStory.isGenerating && "pt-6")}>
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <Home size={20} />
          <span className="hidden md:inline">返回首页</span>
        </button>

        <div className="text-center flex-1 px-4">
          <h2 className="text-white font-medium truncate max-w-[200px] md:max-w-md mx-auto">
            {currentStory.title || currentStory.theme || '长夜故事'}
          </h2>
          <p className="text-xs text-slate-500">
            {currentStory.chapters.length} 章 · {completedChapters}/{currentStory.chapters.length} 已生成 · {currentStory.totalWords} 字
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToTxt}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="导出文本"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => setShowChapters(!showChapters)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors md:hidden"
          >
            <List size={20} />
          </button>
        </div>
        <div className="w-20 hidden md:block">
          <button
            onClick={exportToTxt}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors hidden md:flex items-center gap-2 ml-auto"
            title="导出为TXT"
          >
            <Download size={18} />
            <span className="text-sm">导出文本</span>
          </button>
        </div>
      </div>

      {/* 批量生成进度台 */}
      {currentStory.isBatchGenerating && (
        <div className="bg-slate-800/80 border-b border-slate-700/50 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-amber-500" />
            <span>正在后台静默批量生成（队列剩余：{currentStory.generationQueue.length} 章）</span>
          </div>
          <button
            onClick={stopBatchGeneration}
            className="text-amber-500 hover:text-amber-400 font-medium px-2 py-1 rounded hover:bg-slate-700/50 transition-colors"
          >
            停止批量生成
          </button>
        </div>
      )}

      {/* 进度条 */}
      {isGenerating && !currentStory.isBatchGenerating && (
        <div className="h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 桌面端目录侧栏 */}
        <div className="hidden md:block w-72 border-r border-slate-800/50 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3 px-2">章节目录 <span className="text-xs text-slate-600">（点击切换·长按重新生成）</span></h3>
            <div className="space-y-1">
              {currentStory.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSwitchAndPlayChapter(idx)}
                  onPointerDown={(e) => handleChapterPointerDown(idx, e)}
                  onPointerUp={handleChapterPointerUp}
                  onPointerLeave={handleChapterPointerUp}
                  onContextMenu={(e) => handleChapterContextMenu(idx, e)}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-xl transition-all flex items-start gap-3 group',
                    idx === currentStory.currentChapterIndex
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'hover:bg-slate-800/50'
                  )}
                >
                  <div className="mt-0.5">
                    {getChapterStatusIcon(chapter.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      idx === currentStory.currentChapterIndex
                        ? 'text-amber-300'
                        : chapter.status === 'completed'
                          ? 'text-slate-200'
                          : 'text-slate-500'
                    )}>
                      {chapter.title}
                    </p>
                    {chapter.summary && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {chapter.summary}
                      </p>
                    )}
                    {chapter.status === 'completed' && (
                      <p className="text-xs text-slate-600 mt-1">
                        {chapter.wordCount} 字
                      </p>
                    )}
                    {chapter.status === 'generating' && (
                      <p className="text-xs text-amber-500 mt-1">
                        {chapter.wordCount > 0 ? `生成中... ${chapter.wordCount} 字` : '生成中...'}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 文本区域 */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/80 z-10" />
          
          
          <div
            ref={textContainerRef}
            className="h-full overflow-y-auto px-4 md:px-8 py-8 md:py-12"
          >
            <div className="max-w-2xl mx-auto space-y-8">
              {isGeneratingOutline && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} className="text-amber-400 animate-spin mb-4" />
                  <p className="text-slate-400">正在生成目录...</p>
                </div>
              )}

              {!isGeneratingOutline && viewingChapter && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <h3 className="text-lg font-medium text-amber-300/80 text-center">
                      {viewingChapter.title}
                    </h3>
                    {viewingChapterIndex !== currentStory.currentChapterIndex && (
                      <button
                        onClick={playViewingChapter}
                        className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm hover:bg-amber-500/30 transition-colors inline-flex items-center gap-2"
                      >
                        <Play size={14} fill="currentColor" />
                        从本章开始播放
                      </button>
                    )}
                  </div>
                  {viewingChapter.summary && (
                    <p className="text-sm text-slate-500 text-center italic">
                      {viewingChapter.summary}
                    </p>
                  )}
                  <div className={cn(
                    'text-lg md:text-xl leading-loose text-slate-300/90 space-y-6',
                    settings.fontSize === 'small' && 'text-base',
                    settings.fontSize === 'large' && 'text-2xl'
                  )}>
                    {viewingChapter.status === 'completed' || viewingChapter.content ? (
                      viewingChapter.content ? (
                        paragraphsAndSentences.map((para, pIdx) => {
                          // 计算该段落第一句的全局索引
                          let globalStart = 0
                          for (let i = 0; i < pIdx; i++) {
                            globalStart += paragraphsAndSentences[i].sentences.length
                          }
                          return (
                            <p 
                              key={pIdx} 
                              className="mb-8 leading-relaxed tracking-wide min-h-[1.5em] touch-action-pan-y"
                              onPointerDown={(e) => handleParagraphPointerDown(viewingChapterIndex, pIdx, para.text, e)}
                              onPointerUp={handleParagraphPointerUp}
                              onPointerCancel={handleParagraphPointerUp}
                            >
                              {para.sentences.map((s, sIdx) => {
                                const globalIdx = globalStart + sIdx
                                return (
                                  <span
                                    key={sIdx}
                                    data-sentence-active={viewingChapterIndex === currentStory.currentChapterIndex && isSpeaking && s === currentSentence}
                                    onClick={() => {
                                      stop()
                                      setCurrentStory({ currentChapterIndex: viewingChapterIndex, isPlaying: true, currentSentenceIndex: globalIdx })
                                      speakingChapterRef.current = viewingChapterIndex
                                      justStartedSpeakingRef.current = true
                                      setTimeout(() => speak(viewingChapter.content, globalIdx, { storyTitle: currentStory.title, chapterTitle: viewingChapter.title }), 100)
                                    }}
                                    className={cn(
                                      'transition-colors duration-300 cursor-pointer rounded px-0.5',
                                      viewingChapterIndex === currentStory.currentChapterIndex && isSpeaking && s === currentSentence
                                        ? 'text-amber-300 bg-amber-500/10'
                                        : 'hover:bg-slate-700/40 hover:text-slate-100'
                                    )}
                                  >
                                    {s}
                                  </span>
                                )
                              })}
                            </p>
                          )
                        })
                      ) : (
                        <div className="text-center py-12 text-slate-500 italic">
                          (本部分无正文内容)
                        </div>
                      )
                    ) : (
                      viewingChapter.status === 'generating' ? (
                        <div className="text-center py-10">
                          <Loader2 size={32} className="text-amber-500/50 animate-spin mx-auto mb-4" />
                          <span className="text-slate-500">正在后台生成中，请稍候...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 py-12">
                          <span className="text-slate-500">本章尚未生成</span>
                          <button
                            onClick={() => generateChapter(viewingChapterIndex)}
                            className="px-6 py-2.5 rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors inline-flex items-center gap-2 border border-slate-700/50"
                          >
                            <RefreshCw size={16} />
                            提前生成本章 (不影响当前朗读)
                          </button>
                          
                          <button
                            onClick={() => startBatchGeneration(viewingChapterIndex, 10)}
                            disabled={currentStory.isBatchGenerating}
                            className="px-6 py-2.5 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors inline-flex items-center gap-2 border border-amber-500/30 disabled:opacity-50"
                          >
                            <List size={16} />
                            {currentStory.isBatchGenerating ? '批量生成中...' : '静默批量生成接下来10章'}
                          </button>
                          <span className="text-xs text-slate-600 mt-2">提示：也可以直接点击顶部【从本章开始播放】</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center py-10">
                  <p className="text-red-400 mb-4">生成出错：{error}</p>
                  <button
                    onClick={handleRetryChapter}
                    className="px-6 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    重新生成本章
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端目录抽屉 */}
      {showChapters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowChapters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85%] bg-slate-900 border-l border-slate-700/50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
              <div>
                <h3 className="text-white font-medium">章节目录</h3>
                <p className="text-xs text-slate-500 mt-0.5">点击切换播放·长按重新生成</p>
              </div>
              <button onClick={() => setShowChapters(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {currentStory.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSwitchAndPlayChapter(idx)}
                  onPointerDown={(e) => handleChapterPointerDown(idx, e)}
                  onPointerUp={handleChapterPointerUp}
                  onPointerLeave={handleChapterPointerUp}
                  onContextMenu={(e) => handleChapterContextMenu(idx, e)}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-xl transition-all flex items-start gap-3',
                    idx === currentStory.currentChapterIndex
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'hover:bg-slate-800/50'
                  )}
                >
                  <div className="mt-0.5">
                    {getChapterStatusIcon(chapter.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      idx === currentStory.currentChapterIndex
                        ? 'text-amber-300'
                        : chapter.status === 'completed'
                          ? 'text-slate-200'
                          : 'text-slate-500'
                    )}>
                      {chapter.title}
                    </p>
                    {chapter.summary && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {chapter.summary}
                      </p>
                    )}
                    {idx === currentStory.currentChapterIndex && (
                      <p className="text-xs text-amber-500/70 mt-1">▶ 当前播放</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 悬浮播放控制栏 - fixed定位始终可见 */}
      <div className="fixed bottom-[200px] md:bottom-[170px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-full px-3 py-2 shadow-2xl">
        <button
          onClick={handlePlayPause}
          disabled={playingChapter?.status !== 'completed' || !playingChapter?.content}
          className="w-12 h-12 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
        >
          {isGenerating ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isSpeaking && !isPaused ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <button
          onClick={() => {
            const currentIdx = speedOptions.indexOf(settings.speechRate)
            const nextIdx = (currentIdx + 1) % speedOptions.length
            const newRate = speedOptions[nextIdx]
            setLocalRate(newRate)
            useAppStore.getState().setSettings({ speechRate: newRate })
          }}
          className="h-11 px-4 rounded-full bg-slate-700/80 text-slate-300 text-sm font-bold flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
        >
          {settings.speechRate}x
        </button>
        <div className="w-px h-6 bg-slate-600/50 flex-shrink-0"></div>
        <button
          onClick={() => {
            setViewingChapterIndex(currentStory.currentChapterIndex)
            scrollToCurrentSentence()
          }}
          className="h-11 px-3 rounded-full bg-amber-500/15 text-amber-400 text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0"
        >
          <LocateFixed size={16} />
          定位
        </button>
      </div>

      {/* 控制栏 */}
      <div className="border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
        {/* 定时器显示 */}
        {timerRemaining > 0 && (
          <div className="text-center py-2 text-sm text-amber-400">
            ⏰ {formatTime(timerRemaining)} 后停止播放
          </div>
        )}

        <div className="px-4 py-4 md:py-6">
          <div className="max-w-2xl mx-auto">
            {/* 主控制按钮 */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-4">
              <button
                onClick={() => setShowVolumeMenu(!showVolumeMenu)}
                className="p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all relative"
              >
                <Volume2 size={22} />
              </button>

              <button
                onClick={handlePrevChapter}
                className="p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                disabled={currentStory.currentChapterIndex === 0}
              >
                <SkipBack size={26} />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={playingChapter?.status !== 'completed' || !playingChapter?.content}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 flex items-center justify-center shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : isSpeaking && !isPaused ? (
                  <Pause size={32} fill="currentColor" />
                ) : (
                  <Play size={32} fill="currentColor" className="ml-1" />
                )}
              </button>

              <button
                onClick={handleNextChapter}
                className="p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                disabled={currentStory.currentChapterIndex >= currentStory.chapters.length - 1}
              >
                <SkipForward size={26} />
              </button>

              <button
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                className={cn(
                  'p-3 rounded-full transition-all relative',
                  timerMinutes > 0
                    ? 'text-amber-400 bg-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Timer size={22} />
              </button>
            </div>

            {/* 语速调节 */}
            <div className="flex items-center gap-4 px-4">
              <Gauge size={18} className="text-slate-500 flex-shrink-0" />
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={localRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setLocalRate(val)
                  useAppStore.getState().setSettings({ speechRate: val })
                }}
                className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-sm text-slate-400 w-12 text-right">
                {localRate.toFixed(2)}x
              </span>
            </div>

            {/* 状态提示 */}
            <div className="text-center mt-4 text-sm text-slate-500">
              {isGenerating && <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 正在生成第 {currentStory.currentChapterIndex + 1} 章...</span>}
              {!isGenerating && currentStory.chapters.length > 0 && (
                <span>第 {currentStory.currentChapterIndex + 1} / {currentStory.chapters.length} 章 · 已生成 {completedChapters} 章</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 定时器菜单 */}
      {showTimerMenu && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTimerMenu(false)} />
          <div className="relative w-full md:w-80 md:rounded-2xl rounded-t-3xl bg-slate-900 border border-slate-700/50 p-6 mb-0 md:mb-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">定时停止</h3>
              <button onClick={() => setShowTimerMenu(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {timerOptions.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => {
                    setTimerMinutes(opt.minutes)
                    setShowTimerMenu(false)
                  }}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl text-left transition-all',
                    timerMinutes === opt.minutes
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 长按章节上下文菜单 */}
      {contextMenuIdx !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setContextMenuIdx(null)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-2xl p-4 shadow-2xl min-w-[200px]">
            <p className="text-sm text-slate-400 mb-3 truncate">
              {currentStory.chapters[contextMenuIdx]?.title || '章节'}
            </p>
            <button
              onClick={() => {
                setRenameModalIdx(contextMenuIdx)
                setRenameFormTitle(currentStory.chapters[contextMenuIdx]?.title || '')
                setContextMenuIdx(null)
              }}
              className="w-full px-4 py-3 mb-2 rounded-xl text-left text-slate-200 bg-slate-700/50 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Edit3 size={16} />
              重命名
            </button>
            <button
              onClick={() => {
                const words = (currentStory.chapters[contextMenuIdx]?.wordCount || 0) + 1000
                const initialPrompt = `请你将以下章节进行扩写，目标字数大约在 ${words} 字左右。
用户的额外要求是：无

现有章节标题：${currentStory.chapters[contextMenuIdx]?.title}
现有章节内容：
${currentStory.chapters[contextMenuIdx]?.content || ''}

请直接输出扩写后的完整章节内容，不要包含标题，不要包含任何多余的解释。`
                setExpandModalIdx(contextMenuIdx)
                setExpandForm({ words, prompt: initialPrompt })
                setContextMenuIdx(null)
              }}
              className="w-full px-4 py-3 mb-2 rounded-xl text-left text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
            >
              <PlusCircle size={16} />
              拓展生成
            </button>
            <button
              onClick={() => handleRegenerateChapter(contextMenuIdx)}
              className="w-full px-4 py-3 rounded-xl text-left text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              重新生成此章
            </button>
            <button
              onClick={() => setContextMenuIdx(null)}
              className="w-full px-4 py-3 mt-2 rounded-xl text-left text-slate-400 hover:bg-slate-700/50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 拓展生成 Modal */}
      {expandModalIdx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExpandModalIdx(null)} />
          <div className="relative w-full max-w-lg bg-slate-800 rounded-2xl p-5 shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]">
            <h3 className="text-lg text-slate-100 font-medium mb-1">拓展生成</h3>
            <p className="text-xs text-slate-400 mb-4">当前字数: {currentStory.chapters[expandModalIdx]?.wordCount || 0}。可以直接修改下方的 Prompt。</p>
            <div className="flex-1 min-h-0 mb-4">
              <textarea
                value={expandForm.prompt}
                onChange={(e) => setExpandForm(prev => ({ ...prev, prompt: e.target.value }))}
                className="w-full h-full min-h-[200px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:border-amber-500/50 resize-none font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setExpandModalIdx(null)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleExpandSubmit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium"
              >
                开始拓展
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重写段落 Modal */}
      {rewriteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRewriteModal(null)} />
          <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl p-5 shadow-2xl border border-slate-700/50">
            <h3 className="text-lg text-slate-100 font-medium mb-4">重写段落</h3>
            <div className="bg-slate-900/50 p-3 rounded-xl mb-4 max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-400 leading-relaxed">{rewriteModal.text}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">重写需求</label>
                <textarea
                  value={rewriteReqs}
                  onChange={(e) => setRewriteReqs(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-amber-500/50 resize-none h-24"
                  placeholder="例如：写得更有文采一点、改成搞笑风格、缩写成一句话"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setRewriteModal(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleRewriteSubmit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium"
                >
                  开始重写
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重命名章节 Modal */}
      {renameModalIdx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRenameModalIdx(null)} />
          <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl p-5 shadow-2xl border border-slate-700/50">
            <h3 className="text-lg text-slate-100 font-medium mb-4">重命名章节</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={renameFormTitle}
                onChange={(e) => setRenameFormTitle(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-amber-500/50"
                placeholder="输入新的章节名称"
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setRenameModalIdx(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleRenameSubmit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重新生成 Modal */}
      {regenerateModalIdx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRegenerateModalIdx(null)} />
          <div className="relative w-full max-w-lg bg-slate-800 rounded-2xl p-5 shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]">
            <h3 className="text-lg text-slate-100 font-medium mb-1">重新生成章节</h3>
            <p className="text-xs text-slate-400 mb-4">您可以直接编辑下方的 Prompt 来微调生成方案</p>
            <div className="flex-1 min-h-0 mb-4">
              <textarea
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                className="w-full h-full min-h-[200px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 outline-none focus:border-amber-500/50 resize-none font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRegenerateModalIdx(null)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleRegenerateSubmit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium"
              >
                开始生成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 音量菜单 */}
      {showVolumeMenu && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowVolumeMenu(false)} />
          <div className="relative w-full md:w-80 md:rounded-2xl rounded-t-3xl bg-slate-900 border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">音量调节</h3>
              <button onClick={() => setShowVolumeMenu(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">音量</label>
                <div className="flex items-center gap-4">
                  <Volume2 size={18} className="text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setLocalVolume(val)
                      useAppStore.getState().setSettings({ speechVolume: val })
                    }}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm text-slate-400 w-12 text-right">
                    {Math.round(localVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
