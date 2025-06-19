import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useSystem } from '../contexts/SystemContext'
import { supabase } from '../lib/supabase'
import { Settings as SettingsIcon, Globe, Database, Shield, Upload, Image, Save, X, Palette } from 'lucide-react'

interface SystemSettings {
  logo_url: string | null
  system_name: string
  primary_color: string
  secondary_color: string
}

export function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { settings: systemSettings, refreshSettings } = useSystem()
  const [settings, setSettings] = useState<SystemSettings>({
    logo_url: null,
    system_name: 'Party Member Management System',
    primary_color: '#2563eb',
    secondary_color: '#64748b'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    setSettings(systemSettings)
    setLoading(false)
  }, [systemSettings])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `logo.${fileExt}`
    const filePath = `system/${fileName}`

    // Delete existing logo if it exists
    if (settings.logo_url) {
      const oldPath = settings.logo_url.split('/').pop()
      if (oldPath) {
        await supabase.storage.from('system').remove([`system/${oldPath}`])
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('system')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('system')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'File size must be less than 5MB')
      return
    }

    setUploadingLogo(true)
    try {
      const logoUrl = await uploadLogo(file)
      setSettings(prev => ({ ...prev, logo_url: logoUrl }))
      showMessage('success', 'Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      showMessage('error', 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!settings.logo_url) return

    try {
      // Remove from storage
      const fileName = settings.logo_url.split('/').pop()
      if (fileName) {
        await supabase.storage.from('system').remove([`system/${fileName}`])
      }

      setSettings(prev => ({ ...prev, logo_url: null }))
      showMessage('success', 'Logo removed successfully')
    } catch (error) {
      console.error('Error removing logo:', error)
      showMessage('error', 'Failed to remove logo')
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const settingsToUpdate = [
        { key: 'logo_url', value: settings.logo_url },
        { key: 'system_name', value: settings.system_name },
        { key: 'primary_color', value: settings.primary_color },
        { key: 'secondary_color', value: settings.secondary_color }
      ]

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({ 
            key: setting.key, 
            value: setting.value,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'key' 
          })

        if (error) throw error
      }

      // Refresh the system context
      await refreshSettings()
      
      showMessage('success', 'Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      showMessage('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings')}</h1>
        <p className="mt-2 text-gray-600">
          Manage your system preferences and configurations
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Branding */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <Image className="h-5 w-5 text-gray-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">System Branding</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                System Logo
              </label>
              
              {settings.logo_url ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={settings.logo_url}
                      alt="System Logo"
                      className="h-16 w-16 object-contain rounded-lg border border-gray-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Current logo</p>
                      <button
                        onClick={handleRemoveLogo}
                        className="mt-1 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove logo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No logo uploaded</p>
                </div>
              )}

              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploadingLogo}
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? 'Uploading...' : settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB. Recommended size: 200x200px
                </p>
              </div>
            </div>

            {/* System Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Name
              </label>
              <input
                type="text"
                value={settings.system_name}
                onChange={(e) => setSettings(prev => ({ ...prev, system_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter system name"
              />
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <Palette className="h-5 w-5 text-gray-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Theme Colors</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#64748b"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
              <div className="space-y-2">
                <div 
                  className="h-8 rounded-md flex items-center px-3 text-white text-sm font-medium"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Primary Color
                </div>
                <div 
                  className="h-8 rounded-md flex items-center px-3 text-white text-sm font-medium"
                  style={{ backgroundColor: settings.secondary_color }}
                >
                  Secondary Color
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-gray-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Language Preferences</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Select your preferred language for the interface
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setLanguage('en')}
                className={`px-6 py-3 border rounded-lg text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('kh')}
                className={`px-6 py-3 border rounded-lg text-sm font-medium transition-colors ${
                  language === 'kh'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ភាសាខ្មែរ
              </button>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-gray-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">System Information</h3>
            </div>
          </div>
          <div className="p-6">
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Version</dt>
                <dd className="text-sm text-gray-900">1.0.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Database</dt>
                <dd className="text-sm text-gray-900">Supabase PostgreSQL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Storage</dt>
                <dd className="text-sm text-gray-900">Supabase Storage</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Authentication</dt>
                <dd className="text-sm text-gray-900">Supabase Auth</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}