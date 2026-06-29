import { NavLink } from 'react-router-dom'
import { Home, Play, Settings, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const navItems = [
    { to: '/', icon: Home, label: '首页' },
    { to: '/player', icon: Play, label: '播放' },
    { to: '/history', icon: History, label: '历史' },
    { to: '/settings', icon: Settings, label: '设置' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-around bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 py-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-300',
                isActive
                  ? 'text-amber-300 bg-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              )
            }
          >
            <item.icon size={22} strokeWidth={1.5} />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
