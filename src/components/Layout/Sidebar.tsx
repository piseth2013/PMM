import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Users, 
  UserCog, 
  Settings, 
  LogOut,
  X,
  Building2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSystem } from '../../contexts/SystemContext'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onClose?: () => void
}

export function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  const { signOut } = useAuth()
  const { t } = useLanguage()
  const { settings } = useSystem()

  const navigation = [
    { name: t('dashboard'), href: '/', icon: Home },
    { name: t('members'), href: '/members', icon: Users },
    { name: t('adminUsers'), href: '/admin-users', icon: UserCog },
    { name: t('settings'), href: '/settings', icon: Settings },
  ]

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:shadow-lg
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center min-w-0 flex-1">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt="System Logo"
                className="h-8 w-8 object-contain mr-3 flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {settings.system_name.split(' ').slice(0, 2).join(' ')}
            </h1>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1">
          <div className="px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                  'group-hover:text-gray-500'
                }`} />
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sign out button */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
          <button
            onClick={signOut}
            className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            {t('signOut')}
          </button>
        </div>
      </div>
    </>
  )
}