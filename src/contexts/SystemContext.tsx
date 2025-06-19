import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SystemSettings {
  logo_url: string | null
  system_name: string
  primary_color: string
  secondary_color: string
}

interface SystemContextType {
  settings: SystemSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SystemContext = createContext<SystemContextType | undefined>(undefined)

export function useSystem() {
  const context = useContext(SystemContext)
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider')
  }
  return context
}

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>({
    logo_url: null,
    system_name: 'Party Member Management System',
    primary_color: '#2563eb',
    secondary_color: '#64748b'
  })
  const [loading, setLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')

      if (error) throw error

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>) || {}

      setSettings({
        logo_url: settingsMap.logo_url || null,
        system_name: settingsMap.system_name || 'Party Member Management System',
        primary_color: settingsMap.primary_color || '#2563eb',
        secondary_color: settingsMap.secondary_color || '#64748b'
      })
    } catch (error) {
      console.error('Error loading system settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSettings = async () => {
    await loadSettings()
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const value = {
    settings,
    loading,
    refreshSettings
  }

  return (
    <SystemContext.Provider value={value}>
      {children}
    </SystemContext.Provider>
  )
}