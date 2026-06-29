import { useCallback, useRef, useState } from 'react'
import { useAppStore, StoryChapter } from '@/store/appStore'
import { getApiUrl } from '@/utils/apiBase'

interface UseStoryGeneratorReturn {
  isGenerating: boolean
  isGeneratingOutline: boolean
  error: string | null
  generateOutline: (theme: string, style: string, customStylePrompt: string, targetHours: number) => Promise<boolean>
  generateChapter: (chapterIndex: number) => Promise<void>
  stopGenerating: () => void
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
        const response = await fetch(getApiUrl('/api/story/outline'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme,
            style,
            customStylePrompt,
            targetHours,
            aiBaseUrl: settings.aiBaseUrl,
            apiKey: settings.apiKey,
            model: settings.model,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const chapters: StoryChapter[] = (data.chapters || []).map((ch: any) => ({
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
          title: data.title || theme,
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

        const eventSource = new EventSourcePolyfill(getApiUrl('/api/story/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          }),
          signal: controller.signal,
        })

        eventSource.addEventListener('text', (event: any) => {
          try {
            const data = JSON.parse(event.data)
            fullContent += data.content
            updateChapter(chapterIndex, {
              content: fullContent,
              wordCount: fullContent.length,
            })
          } catch (e) {
            console.error('Parse text error:', e)
          }
        })

        eventSource.addEventListener('summary', (event: any) => {
          try {
            const data = JSON.parse(event.data)
            summary = data.content
            updateChapter(chapterIndex, { summary })
          } catch (e) {
            console.error('Parse summary error:', e)
          }
        })

        eventSource.addEventListener('done', (event: any) => {
          try {
            const data = JSON.parse(event.data)
            updateChapter(chapterIndex, { status: 'completed' })
            eventSource.close()
            resolve({
              content: fullContent,
              summary,
              wordCount: data.totalWords || fullContent.length,
            })
          } catch (e) {
            updateChapter(chapterIndex, { status: 'completed' })
            eventSource.close()
            resolve({ content: fullContent, summary, wordCount: fullContent.length })
          }
        })

        eventSource.addEventListener('error', (event: any) => {
          try {
            const data = JSON.parse(event.data)
            eventSource.close()
            updateChapter(chapterIndex, { status: 'pending' })
            reject(new Error(data.error || '生成失败'))
          } catch {
            eventSource.close()
            updateChapter(chapterIndex, { status: 'pending' })
            reject(new Error('网络错误'))
          }
        })

        eventSource.onerror = () => {
          eventSource.close()
          if (fullContent.length > 100) {
            updateChapter(chapterIndex, { status: 'completed' })
            resolve({ content: fullContent, summary, wordCount: fullContent.length })
          } else {
            updateChapter(chapterIndex, { status: 'pending' })
            reject(new Error('连接中断'))
          }
        }
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
      if (isGenerating) return
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
    [settings.apiKey, isGenerating, currentStory.chapters, generateSingleChapter, setCurrentStory]
  )

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsGenerating(false)
    setIsGeneratingOutline(false)
    setCurrentStory({ isGenerating: false })
  }, [setCurrentStory])

  return {
    isGenerating,
    isGeneratingOutline,
    error,
    generateOutline,
    generateChapter,
    stopGenerating,
  }
}

class EventSourcePolyfill {
  private url: string
  private method: string
  private headers: Record<string, string>
  private body: string
  private signal?: AbortSignal
  private listeners: Record<string, ((event: any) => void)[]> = {}
  private readyState: number = 0
  public onerror: ((event: any) => void) | null = null
  public onmessage: ((event: any) => void) | null = null

  constructor(url: string, options: any = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = options.headers || {}
    this.body = options.body || ''
    this.signal = options.signal
    this.readyState = 0
    this.stream()
  }

  addEventListener(type: string, callback: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
  }

  removeEventListener(type: string, callback: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback)
    }
  }

  private dispatchEvent(type: string, data: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((cb) => cb(data))
    }
    if (type === 'message' && this.onmessage) {
      this.onmessage(data)
    }
  }

  private async stream() {
    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
        signal: this.signal,
      })

      if (!response.ok) {
        this.readyState = 2
        const error = await response.text().catch(() => '')
        this.dispatchEvent('error', { data: JSON.stringify({ error: `HTTP ${response.status}: ${error}` }) })
        if (this.onerror) this.onerror({})
        return
      }

      this.readyState = 1
      const reader = response.body?.getReader()
      if (!reader) {
        this.readyState = 2
        if (this.onerror) this.onerror({})
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let eventType = 'message'

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          this.readyState = 2
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line === '') {
            eventType = 'message'
            continue
          }
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            this.dispatchEvent(eventType, { data })
          }
        }
      }
    } catch (err) {
      this.readyState = 2
      if (this.onerror) this.onerror({})
    }
  }

  close() {
    this.readyState = 2
    if (this.signal) {
      ;(this.signal as any).abort?.()
    }
  }
}
