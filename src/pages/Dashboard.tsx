import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { Users, UserCog, Settings as SettingsIcon, TrendingUp } from 'lucide-react'

export function Dashboard() {
  const { t } = useLanguage()

  const stats = [
    {
      name: t('members'),
      value: '0',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: t('adminUsers'),
      value: '0',
      icon: UserCog,
      color: 'bg-green-500',
    },
    {
      name: 'Active Sessions',
      value: '0',
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
    {
      name: 'System Health',
      value: '100%',
      icon: SettingsIcon,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the Party Member Management System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow-sm rounded-lg border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="text-center py-8 text-gray-500">
              No recent activity to display
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Add New Member</div>
                <div className="text-sm text-blue-700">Register a new party member</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="font-medium text-green-900">Manage Users</div>
                <div className="text-sm text-green-700">Add or edit admin users</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">System Settings</div>
                <div className="text-sm text-purple-700">Configure system preferences</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}