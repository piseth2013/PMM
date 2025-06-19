import React from 'react'
import { Menu, Globe } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSystem } from '../../contexts/SystemContext'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage()
  const { user } = useAuth()
  const { settings } = useSystem()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center ml-4 lg:ml-0">
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="System Logo"
                className="h-8 w-8 object-contain mr-3"
              />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {t('memberManagement')}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Toggle */}
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('kh')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  language === 'kh'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                KH
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="text-sm text-gray-700">
            {user?.email}
          </div>
        </div>
      </div>
    </header>
  )
}