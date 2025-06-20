import React, { createContext, useContext, useState } from 'react'

type Language = 'en' | 'kh'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Auth
    login: 'Login',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    loginError: 'Invalid email or password',
    loading: 'Loading...',
    
    // Navigation
    dashboard: 'Dashboard',
    members: 'Members',
    adminUsers: 'Admin Users',
    settings: 'Settings',
    memberManagement: 'Member Management',
    
    // General
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    
    // Member fields
    name: 'Name',
    position: 'Position',
    partyBranch: 'Party Branch',
    phone: 'Phone',
    dateRegistration: 'Registration Date',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    
    // Dashboard
    totalMembers: 'Total Members',
    newMembersThisMonth: 'New Members This Month',
    activeAdmins: 'Active Admins',
    recentActivity: 'Recent Activity',
  },
  kh: {
    // Auth
    login: 'ចូលប្រព័ន្ធ',
    email: 'អ៊ីមែល',
    password: 'ពាក្យសម្ងាត់',
    signIn: 'ចូល',
    signOut: 'ចេញ',
    loginError: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
    loading: 'កំពុងផ្ទុក...',
    
    // Navigation
    dashboard: 'ផ្ទាំងគ្រប់គ្រង',
    members: 'សមាជិក',
    adminUsers: 'អ្នកគ្រប់គ្រង',
    settings: 'ការកំណត់',
    memberManagement: 'គ្រប់គ្រងសមាជិក',
    
    // General
    save: 'រក្សាទុក',
    cancel: 'បោះបង់',
    edit: 'កែប្រែ',
    delete: 'លុប',
    add: 'បន្ថែម',
    search: 'ស្វែងរក',
    filter: 'តម្រង',
    export: 'នាំចេញ',
    import: 'នាំចូល',
    
    // Member fields
    name: 'ឈ្មោះ',
    position: 'តួនាទី',
    partyBranch: 'សាខាគណបក្ស',
    phone: 'ទូរស័ព្ទ',
    dateRegistration: 'កាលបរិច្ឆេទចុះឈ្មោះ',
    gender: 'ភេទ',
    male: 'ប្រុស',
    female: 'ស្រី',
    other: 'ផ្សេងទៀត',
    
    // Dashboard
    totalMembers: 'សមាជិកសរុប',
    newMembersThisMonth: 'សមាជិកថ្មីខែនេះ',
    activeAdmins: 'អ្នកគ្រប់គ្រងសកម្ម',
    recentActivity: 'សកម្មភាពថ្មីៗ',
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

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key
  }

  const value = {
    language,
    setLanguage,
    t,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}