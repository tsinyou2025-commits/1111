import { NavLink } from 'react-router-dom'
import { Home, Play, Settings, History, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: '首页' },
    { to: '/player', icon: Play, label: '播放器' },
    { to: '/history', icon: History, label: '历史记录' },
    { to: '/settings', icon: Settings, label: '设置' },
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-50 bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/30">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Moon size={20} className="text-slate-900" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">长夜故事</h1>
          <p className="text-xs text-slate-400">让故事陪你入眠</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-amber-300 border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
          >
            <item.icon size={20} strokeWidth={1.5} />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <p className="text-xs text-slate-400 text-center">
          🌙 愿每一夜都有好梦相伴
        </p>
      </div>
    </aside>
  )
}
