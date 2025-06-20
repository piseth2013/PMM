import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'kh'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    members: 'Members',
    adminUsers: 'Admin Users',
    settings: 'Settings',
    
    // Auth
    login: 'Sign In',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
    loginError: 'Invalid email or password',
    
    // General
    memberManagement: 'Member Management',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    
    // Users
    addUser: 'Add User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    inviteAdmin: 'Add User', // Changed from 'Invite Admin'
    fullName: 'Full Name',
    role: 'Role',
    status: 'Status',
    created: 'Created',
    lastLogin: 'Last Login',
    actions: 'Actions',
    
    // Messages
    success: 'Success',
    error: 'Error',
    userCreated: 'User created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
  },
  kh: {
    // Navigation
    dashboard: 'ផ្ទាំងគ្រប់គ្រង',
    members: 'សមាជិក',
    adminUsers: 'អ្នកគ្រប់គ្រង',
    settings: 'ការកំណត់',
    
    // Auth
    login: 'ចូលប្រព័ន្ធ',
    signIn: 'ចូលប្រព័ន្ធ',
    signOut: 'ចាកចេញ',
    email: 'អ៊ីមែល',
    password: 'ពាក្យសម្ងាត់',
    loading: 'កំពុងផ្ទុក...',
    loginError: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
    
    // General
    memberManagement: 'គ្រប់គ្រងសមាជិក',
    save: 'រក្សាទុក',
    cancel: 'បោះបង់',
    edit: 'កែប្រែ',
    delete: 'លុប',
    add: 'បន្ថែម',
    search: 'ស្វែងរក',
    filter: 'តម្រង',
    refresh: 'ផ្ទុកឡើងវិញ',
    
    // Users
    addUser: 'បន្ថែមអ្នកប្រើប្រាស់',
    editUser: 'កែប្រែអ្នកប្រើប្រាស់',
    deleteUser: 'លុបអ្នកប្រើប្រាស់',
    inviteAdmin: 'បន្ថែមអ្នកប្រើប្រាស់', // Changed from 'អញ្ជើញអ្នកគ្រប់គ្រង'
    fullName: 'ឈ្មោះពេញ',
    role: 'តួនាទី',
    status: 'ស្ថានភាព',
    created: 'បានបង្កើត',
    lastLogin: 'ចូលចុងក្រោយ',
    actions: 'សកម្មភាព',
    
    // Messages
    success: 'ជោគជ័យ',
    error: 'កំហុស',
    userCreated: 'បានបង្កើតអ្នកប្រើប្រាស់ដោយជោគជ័យ',
    userUpdated: 'បានកែប្រែអ្នកប្រើប្រាស់ដោយជោគជ័យ',
    userDeleted: 'បានលុបអ្នកប្រើប្រាស់ដោយជោគជ័យ',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'kh')) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}