import { useCallback, useRef, useState, useEffect } from 'react'
import { useAppStore, StoryChapter } from '@/store/appStore'
import { generateOutline as logicGenerateOutline, generateChapterStream } from '../../shared/storyLogic'

interface UseStoryGeneratorReturn {
  isGenerating: boolean
  isGeneratingOutline: boolean
  error: string | null
  generateOutline: (theme: string, style: string, customStylePrompt: string, targetHours: number) => Promise<boolean>
  generateChapter: (chapterIndex: number) => Promise<void>
  stopGenerating: () => void
  startBatchGeneration: (startIndex: number, count?: number) => void
  stopBatchGeneration: () => void
}

export function useStoryGenerator(): UseStoryGeneratorReturn {
  const { settings, setChapters, updateChapter, setCurrentStory, currentStory } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateOutline = useCallback(
    async (theme: string, style: string, customStylePrompt: string, targetHours: number): Promise<boolean> => {
      if (!settings.apiKey) {
        setError('请先在设置中配置 API Key')
        return false
      }

      setIsGeneratingOutline(true)
      setError(null)

      const storyId = Date.now().toString()

      try {
        const outline = await logicGenerateOutline({
          theme,
          style,
          customStylePrompt,
          targetHours,
          aiBaseUrl: settings.aiBaseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
        })

        const chapters: StoryChapter[] = (outline.chapters || []).map((ch: any) => ({
          index: ch.index,
          title: ch.title || `第 ${ch.index + 1} 章`,
          summary: ch.summary || '',
          content: '',
          wordCount: 0,
          status: 'pending' as const,
        }))

        if (chapters.length === 0) {
          const totalChapters = Math.max(8, Math.ceil(targetHours * 6))
          for (let i = 0; i < totalChapters; i++) {
            chapters.push({
              index: i,
              title: `第 ${i + 1} 章`,
              summary: '',
              content: '',
              wordCount: 0,
              status: 'pending',
            })
          }
        }

        setCurrentStory({
          id: storyId,
          title: outline.title || theme,
          theme,
          style,
          customStylePrompt,
          targetHours,
          currentChapterIndex: 0,
          isGenerating: false,
          isPlaying: false,
          totalWords: 0,
        })
        setChapters(chapters)
        return true
      } catch (err: any) {
        setError(err.message || '生成目录失败')
        return false
      } finally {
        setIsGeneratingOutline(false)
      }
    },
    [settings.aiBaseUrl, settings.apiKey, settings.model, setCurrentStory, setChapters]
  )

  const generateSingleChapter = useCallback(
    async (chapterIndex: number): Promise<{ content: string; summary: string; wordCount: number }> => {
      return new Promise((resolve, reject) => {
        const controller = new AbortController()
        abortControllerRef.current = controller

        let fullContent = ''
        let summary = ''

        const chapter = currentStory.chapters[chapterIndex]
        const prevChapter = chapterIndex > 0 ? currentStory.chapters[chapterIndex - 1] : null

        updateChapter(chapterIndex, { status: 'generating' })

        const reqBody = {
            theme: currentStory.theme,
            style: currentStory.style,
            customStylePrompt: currentStory.customStylePrompt,
            targetHours: currentStory.targetHours,
            chapterIndex,
            chapterTitle: chapter?.title,
            totalChapters: currentStory.chapters.length,
            previousSummary: prevChapter?.summary,
            previousEnding: prevChapter?.content?.slice(-300),
            aiBaseUrl: settings.aiBaseUrl,
            apiKey: settings.apiKey,
            model: settings.model,
          }

          let lastUpdateTime = 0
          
          // Using a mock abort feature by setting a flag, since fetch streams in storyLogic don't take AbortSignal yet.
          // For now, if stopGenerating is called, we can set a ref and throw inside onText.
          
          generateChapterStream(
            reqBody,
            (contentChunk) => {
              if (abortControllerRef.current?.signal.aborted) throw new Error("Aborted")
              fullContent += contentChunk
              const now = Date.now()
              const isBackground = useAppStore.getState().currentStory.isBatchGenerating && useAppStore.getState().currentStory.currentChapterIndex !== chapterIndex
              const throttleTime = isBackground ? 2000 : 200
              
              if (now - lastUpdateTime > throttleTime) {
                updateChapter(chapterIndex, {
                  content: fullContent,
                  wordCount: fullContent.length,
                })
                lastUpdateTime = now
              }
            },
            (summaryText) => {
              if (abortControllerRef.current?.signal.aborted) throw new Error("Aborted")
              summary = summaryText
              updateChapter(chapterIndex, { summary })
            },
            () => {
              if (abortControllerRef.current?.signal.aborted) throw new Error("Aborted")
              updateChapter(chapterIndex, { 
                content: fullContent,
                wordCount: fullContent.length,
                status: 'completed' 
              })
            },
            (totalWords) => {
              resolve({
                content: fullContent,
                summary,
                wordCount: totalWords || fullContent.length,
              })
            },
            (errStr) => {
              if (fullContent.length > 100) {
                resolve({ content: fullContent, summary, wordCount: fullContent.length })
              } else {
                updateChapter(chapterIndex, { status: 'pending' })
                reject(new Error(errStr))
              }
            }
          ).catch((e) => {
             updateChapter(chapterIndex, { status: 'pending' })
             reject(e)
          })
      })
    },
    [settings.aiBaseUrl, settings.apiKey, settings.model, currentStory, updateChapter]
  )

  const generateChapter = useCallback(
    async (chapterIndex: number) => {
      if (!settings.apiKey) {
        setError('请先在设置中配置 API Key')
        return
      }
      if (currentStory.isGenerating) return
      if (currentStory.chapters[chapterIndex]?.status === 'completed') return
      if (currentStory.chapters[chapterIndex]?.status === 'generating') return

      setIsGenerating(true)
      setError(null)
      setCurrentStory({ isGenerating: true })

      try {
        await generateSingleChapter(chapterIndex)
      } catch (err: any) {
        setError(err.message || '生成出错')
      } finally {
        setIsGenerating(false)
        setCurrentStory({ isGenerating: false })
      }
    },
    [settings.apiKey, currentStory.isGenerating, currentStory.chapters, generateSingleChapter, setCurrentStory]
  )

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsGenerating(false)
    setIsGeneratingOutline(false)
    setCurrentStory({ isGenerating: false, isBatchGenerating: false, generationQueue: [] })
  }, [setCurrentStory])

  const startBatchGeneration = useCallback((startIndex: number, count: number = 10) => {
    const queue: number[] = []
    const chapters = useAppStore.getState().currentStory.chapters
    for (let i = startIndex; i < Math.min(chapters.length, startIndex + count); i++) {
      if (chapters[i].status === 'pending') {
        queue.push(i)
      }
    }
    if (queue.length > 0) {
      setCurrentStory({ generationQueue: queue, isBatchGenerating: true })
    }
  }, [setCurrentStory])

  const stopBatchGeneration = useCallback(() => {
    setCurrentStory({ generationQueue: [], isBatchGenerating: false })
  }, [setCurrentStory])

  // Process the queue
  useEffect(() => {
    const state = useAppStore.getState().currentStory
    if (state.isBatchGenerating && !state.isGenerating && state.generationQueue.length > 0) {
      const nextIndex = state.generationQueue[0]
      
      const processNext = async () => {
        try {
          await generateChapter(nextIndex)
        } finally {
          const currentQueue = useAppStore.getState().currentStory.generationQueue
          if (currentQueue.includes(nextIndex)) {
            const newQueue = currentQueue.filter(i => i !== nextIndex)
            setCurrentStory({ 
              generationQueue: newQueue,
              isBatchGenerating: newQueue.length > 0 
            })
          }
        }
      }
      
      processNext()
    }
  }, [currentStory.isBatchGenerating, currentStory.isGenerating, currentStory.generationQueue, generateChapter, setCurrentStory])

  return {
    isGenerating,
    isGeneratingOutline,
    error,
    generateOutline,
    generateChapter,
    stopGenerating,
    startBatchGeneration,
    stopBatchGeneration,
  }
}
