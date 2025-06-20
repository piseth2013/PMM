import React from 'react'
import { Users, Shield, Key, CheckCircle } from 'lucide-react'

interface AdminUser {
  id: string
  role_name?: string
  activity_status?: string
}

interface UsersStatsProps {
  users: AdminUser[]
}

export function UsersStats({ users }: UsersStatsProps) {
  const totalUsers = users.length
  const superAdmins = users.filter(u => u.role_name === 'super_admin').length
  const admins = users.filter(u => u.role_name === 'admin').length
  const activeUsers = users.filter(u => u.activity_status === 'Active').length

  const stats = [
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Super Admins',
      value: superAdmins,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Admins',
      value: admins,
      icon: Key,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Active Users',
      value: activeUsers,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}