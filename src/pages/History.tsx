import { useNavigate } from 'react-router-dom'
import { History, Play, Trash2, Clock, BookOpen, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

const styleNames: Record<string, string> = {
  arthistory: '艺术史',
  fantasy: '奇幻冒险',
  knowledge: '知识科普',
  history: '历史叙事',
  nature: '自然风景',
  meditation: '冥想引导',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { history, removeFromHistory, clearHistory, setCurrentStory } = useAppStore()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePlay = (story: typeof history[0]) => {
    const chapters = story.chapters.map((ch) => ({
      ...ch,
      status: (ch.status || 'completed') as 'pending' | 'generating' | 'completed',
    }))
    setCurrentStory({
      id: story.id,
      title: story.theme,
      theme: story.theme,
      style: story.style,
      customStylePrompt: '',
      targetHours: story.targetHours,
      chapters,
      currentChapterIndex: 0,
      isGenerating: false,
      isPlaying: false,
      totalWords: story.totalWords,
    })
    navigate('/player')
  }

  return (
    <div className="min-h-screen md:pl-64 pb-24 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <History size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">历史记录</h1>
              <p className="text-sm text-slate-400">{history.length} 个故事</p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定要清空所有历史记录吗？')) {
                  clearHistory()
                }
              }}
              className="text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              清空全部
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <BookOpen size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-400 mb-6">还没有生成过故事</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium inline-flex items-center gap-2"
            >
              去生成第一个故事
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((story) => (
              <div
                key={story.id}
                className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-lg mb-2 truncate">
                      {story.theme}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-700/50 text-xs">
                        {styleNames[story.style] || story.style}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} />
                        {story.chapters.length} 章
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {Math.round(story.totalWords / 200)} 分钟
                      </span>
                      <span>{formatDate(story.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlay(story)}
                      className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-105 transition-all"
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('确定删除这个故事吗？')) {
                          removeFromHistory(story.id)
                        }
                      }}
                      className="p-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
