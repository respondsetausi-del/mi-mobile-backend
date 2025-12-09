'use client'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, Users, UserCog, Key, Send, Bell, 
  Palette, LogOut, ChevronRight, Settings, FileText
} from 'lucide-react'

interface SidebarProps {
  role: 'admin' | 'mentor'
}

const adminMenuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Users', icon: Users, path: '/admin/users' },
  { name: 'Mentors', icon: UserCog, path: '/admin/mentors' },
  { name: 'Licenses', icon: Key, path: '/admin/licenses' },
  { name: 'Send Signal', icon: Send, path: '/admin/signals' },
  { name: 'Send News', icon: Bell, path: '/admin/news' },
]

const mentorMenuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/mentor' },
  { name: 'My Users', icon: Users, path: '/mentor/users' },
  { name: 'Licenses', icon: Key, path: '/mentor/licenses' },
  { name: 'Send Signal', icon: Send, path: '/mentor/signals' },
  { name: 'Send News', icon: Bell, path: '/mentor/news' },
  { name: 'Branding', icon: Palette, path: '/mentor/branding' },
]

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const menuItems = role === 'admin' ? adminMenuItems : mentorMenuItems

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'admin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
            <span className="text-white font-bold">MI</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">MI Dashboard</h1>
            <p className="text-xs text-gray-500 capitalize">{role} Portal</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? role === 'admin' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
              {isActive && <ChevronRight size={16} className="ml-auto" />}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
