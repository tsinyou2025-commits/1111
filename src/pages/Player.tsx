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
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useSpeech } from '@/hooks/useSpeech'
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
  const { currentStory, settings, addToHistory, setCurrentStory, updateChapter } = useAppStore()
  const { isSpeaking, isPaused, speak, pause, resume, stop, currentSentence, availableVoices } = useSpeech()
  const { isGenerating, isGeneratingOutline, error, generateChapter, stopGenerating } = useStoryGenerator()

  const textContainerRef = useRef<HTMLDivElement>(null)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [showVolumeMenu, setShowVolumeMenu] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [viewingChapterIndex, setViewingChapterIndex] = useState(currentStory.currentChapterIndex)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [localVolume, setLocalVolume] = useState(settings.speechVolume)
  const [localRate, setLocalRate] = useState(settings.speechRate)
  const timerRef = useRef<number | null>(null)
  const startedStoryIdRef = useRef<string | null>(null)
  const autoGeneratingRef = useRef(false)
  const speakingChapterRef = useRef<number>(-1)
  const scrollLockRef = useRef(false)

  const playingChapter = currentStory.chapters[currentStory.currentChapterIndex]
  const viewingChapter = currentStory.chapters[viewingChapterIndex]
  const completedChapters = currentStory.chapters.filter((c) => c.status === 'completed').length

  // 拆分句子用于高亮
  const sentences = viewingChapter?.content
    ? viewingChapter.content.match(/[^。！？.!?]+[。！？.!?]+/g) || [viewingChapter.content]
    : []

  // 当后台播放章节自动切换时，如果用户没有在浏览其他章节，则自动跟随
  useEffect(() => {
    if (autoGeneratingRef.current) {
       setViewingChapterIndex(currentStory.currentChapterIndex)
    }
  }, [currentStory.currentChapterIndex])

  useEffect(() => {
    if (!currentStory.theme || !currentStory.id) {
      navigate('/')
    }
  }, [currentStory.theme, currentStory.id, navigate])

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
      // 历史记录里的故事，直接开始播放
      speak(firstChapter.content)
      setCurrentStory({ isPlaying: true })
      speakingChapterRef.current = 0
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
      speak(playingChapter.content)
      speakingChapterRef.current = currentStory.currentChapterIndex
    }
  }, [playingChapter?.status, playingChapter?.content, currentStory.currentChapterIndex, currentStory.isPlaying, isSpeaking, isPaused, speak])

  // 当前章播放结束 → 自动跳下一章
  useEffect(() => {
    if (isSpeaking || isPaused) return
    if (!currentStory.isPlaying) return
    if (!playingChapter || playingChapter.status !== 'completed') return
    if (speakingChapterRef.current !== currentStory.currentChapterIndex) return
    if (autoGeneratingRef.current) return

    const nextIdx = currentStory.currentChapterIndex + 1
    if (nextIdx >= currentStory.chapters.length) return

    const nextChapter = currentStory.chapters[nextIdx]
    if (!nextChapter) return

    autoGeneratingRef.current = true

    if (nextChapter.status === 'completed') {
      setCurrentStory({ currentChapterIndex: nextIdx })
      autoGeneratingRef.current = false
    } else if (nextChapter.status === 'pending') {
      setCurrentStory({ currentChapterIndex: nextIdx })
      generateChapter(nextIdx).finally(() => {
        autoGeneratingRef.current = false
      })
    } else {
      autoGeneratingRef.current = false
    }
  }, [isSpeaking, isPaused, currentStory.isPlaying, currentStory.currentChapterIndex, currentStory.chapters.length, playingChapter?.status, generateChapter, setCurrentStory])

  // 滚动到当前句子（生成中不滚动，避免鬼畜）
  useEffect(() => {
    if (!currentSentence) return
    if (isGenerating) return
    if (scrollLockRef.current) return

    scrollLockRef.current = true
    const timer = setTimeout(() => {
      scrollLockRef.current = false
    }, 300)

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
      })
    }
  }, [currentStory.chapters.length, currentStory.totalWords])

  const handlePlayPause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      pause()
      setCurrentStory({ isPlaying: false })
    } else if (isPaused) {
      resume()
      setCurrentStory({ isPlaying: true })
    } else if (playingChapter?.status === 'completed' && playingChapter.content) {
      speak(playingChapter.content)
      speakingChapterRef.current = currentStory.currentChapterIndex
      setCurrentStory({ isPlaying: true })
    }
  }, [isSpeaking, isPaused, playingChapter, currentStory.currentChapterIndex, speak, pause, resume, setCurrentStory])

  const handlePrevChapter = () => {
    if (currentStory.currentChapterIndex > 0) {
      const prevIdx = currentStory.currentChapterIndex - 1
      const prevChapter = currentStory.chapters[prevIdx]
      if (prevChapter?.status === 'completed') {
        stop()
        setCurrentStory({ currentChapterIndex: prevIdx, isPlaying: true })
        setViewingChapterIndex(prevIdx)
        speakingChapterRef.current = prevIdx
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
        setCurrentStory({ currentChapterIndex: nextIdx, isPlaying: true })
        setViewingChapterIndex(nextIdx)
        speakingChapterRef.current = nextIdx
        setTimeout(() => {
          speak(nextChapter.content)
        }, 100)
      } else if (nextChapter.status === 'pending') {
        setCurrentStory({ currentChapterIndex: nextIdx, isPlaying: true })
        setViewingChapterIndex(nextIdx)
        generateChapter(nextIdx)
      }
    }
  }

  const handleJumpToChapter = (index: number) => {
    setViewingChapterIndex(index)
    setShowChapters(false)
  }

  const handleRetryChapter = () => {
    if (viewingChapter) {
      generateChapter(viewingChapterIndex)
    }
  }

  const playViewingChapter = () => {
    const chapter = currentStory.chapters[viewingChapterIndex]
    if (!chapter) return

    if (chapter.status === 'completed') {
      stop()
      setCurrentStory({ currentChapterIndex: viewingChapterIndex, isPlaying: true })
      speakingChapterRef.current = viewingChapterIndex
      setTimeout(() => {
        speak(chapter.content)
      }, 100)
    } else if (chapter.status === 'pending') {
      setCurrentStory({ currentChapterIndex: viewingChapterIndex, isPlaying: true })
      generateChapter(viewingChapterIndex)
    }
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

  const isVisible = location.pathname === '/player'
  if (!isVisible) {
    if (!currentStory.id || !playingChapter) return null
    return (
      <div className="fixed bottom-[80px] left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-96 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl z-50 flex items-center gap-4">
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate('/player')}
        >
          <div className="text-xs text-amber-400 mb-1 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            后台播放中
          </div>
          <div className="text-sm text-slate-200 font-medium truncate">
            {playingChapter.title}
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {currentStory.title || currentStory.theme}
          </div>
        </div>
        <button
          onClick={handlePlayPause}
          disabled={playingChapter?.status !== 'completed' || !playingChapter?.content}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          {isGenerating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isSpeaking && !isPaused ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
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

        <button
          onClick={() => setShowChapters(!showChapters)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors md:hidden"
        >
          <List size={20} />
        </button>
        <div className="w-20 hidden md:block" />
      </div>

      {/* 进度条 */}
      {isGenerating && (
        <div className="h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 桌面端目录侧栏 */}
        <div className="hidden md:block w-72 border-r border-slate-800/50 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3 px-2">章节目录</h3>
            <div className="space-y-1">
              {currentStory.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleJumpToChapter(idx)}
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
                      <p className="text-xs text-amber-500 mt-1">生成中...</p>
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
          
          {(viewingChapterIndex !== currentStory.currentChapterIndex) && (
            <button
              onClick={() => {
                setViewingChapterIndex(currentStory.currentChapterIndex)
                setTimeout(() => {
                  const el = document.querySelector('[data-sentence-active="true"]')
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }}
              className="absolute bottom-8 right-8 z-20 flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-full shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all font-medium text-sm"
            >
              <LocateFixed size={16} />
              定位到播放位置
            </button>
          )}
          
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
                    'text-lg md:text-xl leading-loose text-slate-300/90',
                    settings.fontSize === 'small' && 'text-base',
                    settings.fontSize === 'large' && 'text-2xl'
                  )} style={{ textIndent: '2em' }}>
                    {viewingChapter.content ? (
                      sentences.map((s, idx) => (
                        <span
                          key={idx}
                          data-sentence-active={viewingChapterIndex === currentStory.currentChapterIndex && isSpeaking && s === currentSentence}
                          className={cn(
                            'transition-colors duration-300',
                            viewingChapterIndex === currentStory.currentChapterIndex && isSpeaking && s === currentSentence
                              ? 'text-amber-300 bg-amber-500/10 rounded px-1'
                              : ''
                          )}
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      viewingChapter.status === 'generating' ? (
                        <span className="text-slate-500">正在生成中，请稍候...</span>
                      ) : (
                        <span className="text-slate-600">点击【从本章开始播放】开始生成</span>
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
              <h3 className="text-white font-medium">章节目录</h3>
              <button onClick={() => setShowChapters(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {currentStory.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleJumpToChapter(idx)}
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
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
