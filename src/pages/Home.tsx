import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sparkles, Clock, Play, ChevronRight, Plus, X, Edit3, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useStoryGenerator } from '@/hooks/useStoryGenerator'
import { cn } from '@/lib/utils'

interface CustomStyle {
  id: string
  name: string
  desc: string
  icon: string
  prompt: string
}

const presetThemes = [
  '佛罗伦萨大教堂',
  '古埃及神庙',
  '哥特式教堂',
  '凡尔赛宫',
  '敦煌壁画',
  '巴洛克宫殿',
  '日本茶室',
  '玛雅金字塔',
]

const defaultStyleOptions = [
  { id: 'documentary', name: '人文专栏', desc: '无废话·高信息密度·结构清晰', icon: '📝' },
  { id: 'arthistory', name: '艺术史', desc: '建筑·人物·神秘学', icon: '🏛️' },
  { id: 'fantasy', name: '奇幻冒险', desc: '魔法与异世界之旅', icon: '✨' },
  { id: 'knowledge', name: '知识科普', desc: '生动有趣的知识讲解', icon: '📚' },
  { id: 'history', name: '历史叙事', desc: '穿越时空的历史长卷', icon: '🏺' },
  { id: 'nature', name: '自然风景', desc: '舒缓宁静的大自然', icon: '🌿' },
  { id: 'meditation', name: '冥想引导', desc: '放松身心的冥想之旅', icon: '🧘' },
]

const durationOptions = [
  { hours: 2, label: '2小时', desc: '小憩一下' },
  { hours: 4, label: '4小时', desc: '舒适睡眠' },
  { hours: 6, label: '6小时', desc: '深度睡眠' },
  { hours: 8, label: '8小时', desc: '整夜安眠' },
]

const STORAGE_KEY = 'long-night-custom-styles'

function loadCustomStyles(): CustomStyle[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveCustomStyles(styles: CustomStyle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(styles))
}

export default function Home() {
  const navigate = useNavigate()
  const { settings, setCurrentStory, currentStory } = useAppStore()
  const { generateOutline, isGeneratingOutline, error } = useStoryGenerator()
  const [theme, setTheme] = useState(currentStory.theme || '')
  const [style, setStyle] = useState(currentStory.style || 'arthistory')
  const [customStylePrompt, setCustomStylePrompt] = useState('')
  const [targetHours, setTargetHours] = useState(currentStory.targetHours || 4)
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([])
  const [showStyleEditor, setShowStyleEditor] = useState(false)
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null)
  const [styleForm, setStyleForm] = useState({ name: '', desc: '', icon: '🎭', prompt: '' })

  useEffect(() => {
    setCustomStyles(loadCustomStyles())
  }, [])

  const allStyleOptions = [
    ...defaultStyleOptions,
    ...customStyles.map((s) => ({ ...s, isCustom: true })),
  ]

  const handleStart = async () => {
    if (!theme.trim()) {
      alert('请输入故事主题')
      return
    }
    if (!settings.apiKey) {
      navigate('/settings')
      alert('请先配置 AI 接口')
      return
    }

    const customStyle = customStyles.find((s) => s.id === style)
    const prompt = customStyle ? customStyle.prompt : ''

    const success = await generateOutline(theme.trim(), style, prompt, targetHours)
    if (success) {
      navigate('/player')
    }
  }

  const openEditor = (styleToEdit?: CustomStyle) => {
    if (styleToEdit) {
      setEditingStyle(styleToEdit)
      setStyleForm({
        name: styleToEdit.name,
        desc: styleToEdit.desc,
        icon: styleToEdit.icon,
        prompt: styleToEdit.prompt,
      })
    } else {
      setEditingStyle(null)
      setStyleForm({ name: '', desc: '', icon: '🎭', prompt: '' })
    }
    setShowStyleEditor(true)
  }

  const saveStyle = () => {
    if (!styleForm.name.trim() || !styleForm.prompt.trim()) {
      alert('请填写风格名称和描述')
      return
    }

    let newStyles: CustomStyle[]
    if (editingStyle) {
      newStyles = customStyles.map((s) =>
        s.id === editingStyle.id
          ? { ...s, ...styleForm }
          : s
      )
    } else {
      const newStyle: CustomStyle = {
        id: 'custom-' + Date.now(),
        ...styleForm,
      }
      newStyles = [...customStyles, newStyle]
    }

    setCustomStyles(newStyles)
    saveCustomStyles(newStyles)
    setShowStyleEditor(false)

    if (!editingStyle) {
      setStyle(newStyles[newStyles.length - 1].id)
    }
  }

  const deleteStyle = (id: string) => {
    if (!confirm('确定删除这个自定义风格吗？')) return
    const newStyles = customStyles.filter((s) => s.id !== id)
    setCustomStyles(newStyles)
    saveCustomStyles(newStyles)
    if (style === id) {
      setStyle('arthistory')
    }
  }

  const iconOptions = ['🎭', '🎨', '📜', '🔮', '🌙', '⭐', '🗿', '🏰', '🎪', '🎠', '🦉', '🐉']

  return (
    <div className="min-h-screen md:pl-64 pb-24 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4">
            <Moon size={32} className="text-slate-900" fill="currentColor" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            长夜故事
          </h1>
          <p className="text-slate-400 text-lg">
            让 AI 为你创作专属的睡前故事，伴你安然入眠
          </p>
        </div>

        {/* 主题输入 */}
        <div className="mb-8">
          <label className="flex items-center gap-2 text-slate-300 mb-3">
            <Sparkles size={18} className="text-amber-400" />
            <span className="font-medium">故事主题</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="今晚想听什么故事？"
              className="w-full px-6 py-4 text-lg rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all backdrop-blur-sm"
            />
          </div>

          {/* 预设主题 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {presetThemes.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm transition-all duration-300',
                  theme === t
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 风格选择 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-slate-300">
              <span className="text-lg">🎨</span>
              <span className="font-medium">故事风格</span>
            </label>
            <button
              onClick={() => openEditor()}
              className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Plus size={16} />
              自定义
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allStyleOptions.map((s: any) => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    'w-full p-4 rounded-2xl border transition-all duration-300 text-left',
                    style === s.id
                      ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                  )}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={cn(
                    'font-medium text-sm',
                    style === s.id ? 'text-amber-300' : 'text-slate-300'
                  )}>
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
                </button>
                {s.isCustom && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditor(s) }}
                      className="p-1.5 rounded-lg bg-slate-700/80 text-slate-300 hover:text-white"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteStyle(s.id) }}
                      className="p-1.5 rounded-lg bg-slate-700/80 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="mb-10">
          <label className="flex items-center gap-2 text-slate-300 mb-3">
            <Clock size={18} className="text-amber-400" />
            <span className="font-medium">播放时长</span>
          </label>
          <div className="grid grid-cols-4 gap-3">
            {durationOptions.map((d) => (
              <button
                key={d.hours}
                onClick={() => setTargetHours(d.hours)}
                className={cn(
                  'p-4 rounded-2xl border transition-all duration-300 text-center',
                  targetHours === d.hours
                    ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                )}
              >
                <div className={cn(
                  'text-xl font-bold mb-1',
                  targetHours === d.hours ? 'text-amber-300' : 'text-slate-300'
                )}>
                  {d.label}
                </div>
                <div className="text-xs text-slate-500">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 开始按钮 */}
        <button
          onClick={handleStart}
          disabled={isGeneratingOutline}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-bold text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isGeneratingOutline ? (
            <>
              <Sparkles size={24} className="animate-spin" />
              <span>正在生成目录...</span>
            </>
          ) : (
            <>
              <Play size={24} fill="currentColor" />
              <span>开始生成故事</span>
              <ChevronRight size={20} />
            </>
          )}
        </button>

        {error && (
          <p className="text-center text-red-400 text-sm mt-3">{error}</p>
        )}

        {!settings.apiKey && (
          <p className="text-center text-amber-400/70 text-sm mt-4">
            ⚠️ 请先在设置中配置 AI 接口
          </p>
        )}
      </div>

      {/* 自定义风格编辑器弹窗 */}
      {showStyleEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStyleEditor(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700/50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingStyle ? '编辑风格' : '新建自定义风格'}
              </h2>
              <button
                onClick={() => setShowStyleEditor(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">风格图标</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setStyleForm({ ...styleForm, icon })}
                      className={cn(
                        'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                        styleForm.icon === icon
                          ? 'bg-amber-500/20 border border-amber-500/40'
                          : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">风格名称</label>
                <input
                  type="text"
                  value={styleForm.name}
                  onChange={(e) => setStyleForm({ ...styleForm, name: e.target.value })}
                  placeholder="比如：艺术史"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">简短描述</label>
                <input
                  type="text"
                  value={styleForm.desc}
                  onChange={(e) => setStyleForm({ ...styleForm, desc: e.target.value })}
                  placeholder="比如：建筑·人物·神秘学"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  风格详细描述（Prompt）
                </label>
                <textarea
                  value={styleForm.prompt}
                  onChange={(e) => setStyleForm({ ...styleForm, prompt: e.target.value })}
                  placeholder="详细描述你想要的故事风格、叙事方式、内容特点等..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none leading-relaxed"
                />
                <p className="text-xs text-slate-500 mt-2">
                  描述越详细，生成的故事越符合你的口味。可以说清楚：叙事节奏、语言风格、内容偏好、特殊要求等。
                </p>
              </div>

              <button
                onClick={saveStyle}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
              >
                {editingStyle ? '保存修改' : '创建风格'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
