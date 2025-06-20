import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { UserCog, Plus, Search, Filter } from 'lucide-react'

export function AdminUsers() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminUsers')}</h1>
          <p className="mt-2 text-gray-600">
            Manage system administrators and their permissions
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          {t('add')} Admin User
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search admin users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              {t('filter')}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <UserCog className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No admin users</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first admin user.
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('add')} Admin User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}