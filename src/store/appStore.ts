import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StoryChapter {
  index: number
  title: string
  summary?: string
  content: string
  wordCount: number
  status: 'pending' | 'generating' | 'completed'
}

export interface StoryHistory {
  id: string
  theme: string
  style: string
  targetHours: number
  createdAt: number
  chapters: StoryChapter[]
  totalWords: number
}

export interface AppSettings {
  aiBaseUrl: string
  apiKey: string
  model: string
  voiceName: string
  speechRate: number
  speechPitch: number
  speechVolume: number
  theme: 'dark' | 'light'
  fontSize: 'small' | 'medium' | 'large'
}

interface AppState {
  settings: AppSettings
  currentStory: {
    id: string | null
    title: string
    theme: string
    style: string
    customStylePrompt: string
    targetHours: number
    chapters: StoryChapter[]
    currentChapterIndex: number
    isGenerating: boolean
    isGeneratingOutline: boolean
    isPlaying: boolean
    currentSentenceIndex: number
    totalWords: number
  }
  history: StoryHistory[]
  setSettings: (settings: Partial<AppSettings>) => void
  setCurrentStory: (story: Partial<AppState['currentStory']>) => void
  setChapters: (chapters: StoryChapter[]) => void
  addChapter: (chapter: StoryChapter) => void
  updateChapter: (index: number, updates: Partial<StoryChapter>) => void
  addToHistory: (story: StoryHistory) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
}

const defaultSettings: AppSettings = {
  aiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  voiceName: '',
  speechRate: 0.85,
  speechPitch: 1,
  speechVolume: 1,
  theme: 'dark',
  fontSize: 'medium',
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      currentStory: {
        id: null,
        title: '',
        theme: '',
        style: 'nature',
        customStylePrompt: '',
        targetHours: 4,
        chapters: [],
        currentChapterIndex: 0,
        isGenerating: false,
        isGeneratingOutline: false,
        isPlaying: false,
        currentSentenceIndex: 0,
        totalWords: 0,
      },
      history: [],
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setCurrentStory: (story) =>
        set((state) => ({
          currentStory: { ...state.currentStory, ...story },
        })),
      setChapters: (chapters) =>
        set((state) => ({
          currentStory: {
            ...state.currentStory,
            chapters,
            totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
          },
        })),
      addChapter: (chapter) =>
        set((state) => ({
          currentStory: {
            ...state.currentStory,
            chapters: [...state.currentStory.chapters, chapter],
            totalWords: state.currentStory.totalWords + chapter.wordCount,
          },
        })),
      updateChapter: (index, updates) =>
        set((state) => ({
          currentStory: {
            ...state.currentStory,
            chapters: state.currentStory.chapters.map((ch, i) =>
              i === index ? { ...ch, ...updates } : ch
            ),
          },
        })),
      addToHistory: (story) =>
        set((state) => {
          const existing = state.history.find((h) => h.id === story.id)
          if (existing) {
            return {
              history: state.history.map((h) =>
                h.id === story.id ? story : h
              ),
            }
          }
          return {
            history: [story, ...state.history].slice(0, 50),
          }
        }),
      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'long-night-stories',
      partialize: (state) => ({
        settings: state.settings,
        history: state.history,
      }),
    }
  )
)
