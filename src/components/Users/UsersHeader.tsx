import React from 'react'
import { UserPlus, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

interface UsersHeaderProps {
  onAddUser: () => void
  onRefresh: () => void
  refreshing: boolean
}

export function UsersHeader({ onAddUser, onRefresh, refreshing }: UsersHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('adminUsers')}</h1>
        <p className="mt-2 text-gray-600">
          Manage system administrators and their permissions
        </p>
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={onAddUser}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>
    </div>
  )
}