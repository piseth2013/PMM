import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { SystemProvider } from './contexts/SystemContext'
import { Layout } from './components/Layout/Layout'
import { LoginForm } from './components/Auth/LoginForm'
import { Dashboard } from './pages/Dashboard'
import { Members } from './pages/Members'
import { AdminUsers } from './pages/AdminUsers'
import { Settings } from './pages/Settings'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/admin-users" element={<AdminUsers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <SystemProvider>
            <AppContent />
          </SystemProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  )
}

export default App