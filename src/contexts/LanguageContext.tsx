import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'kh'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Translation dictionary
const translations = {
  en: {
    // Auth
    login: 'Login',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    loading: 'Loading...',
    loginError: 'Invalid email or password',
    
    // Navigation
    dashboard: 'Dashboard',
    members: 'Members',
    adminUsers: 'Admin Users',
    settings: 'Settings',
    memberManagement: 'Member Management',
    
    // Common
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
    nameEn: 'Name (English)',
    nameKh: 'Name (Khmer)',
    idNumber: 'ID Number',
    gender: 'Gender',
    position: 'Position',
    positionEn: 'Position (English)',
    positionKh: 'Position (Khmer)',
    partyBranch: 'Party Branch',
    partyBranchEn: 'Party Branch (English)',
    partyBranchKh: 'Party Branch (Khmer)',
    phone: 'Phone',
    dateRegistration: 'Registration Date',
    profilePicture: 'Profile Picture',
    attachments: 'Attachments',
    
    // Gender options
    male: 'Male',
    female: 'Female',
    other: 'Other',
    
    // Status
    active: 'Active',
    inactive: 'Inactive',
    
    // Messages
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  },
  kh: {
    // Auth
    login: 'ចូលប្រព័ន្ធ',
    email: 'អ៊ីមែល',
    password: 'ពាក្យសម្ងាត់',
    signIn: 'ចូល',
    signOut: 'ចេញ',
    loading: 'កំពុងផ្ទុក...',
    loginError: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
    
    // Navigation
    dashboard: 'ផ្ទាំងគ្រប់គ្រង',
    members: 'សមាជិក',
    adminUsers: 'អ្នកគ្រប់គ្រង',
    settings: 'ការកំណត់',
    memberManagement: 'គ្រប់គ្រងសមាជិក',
    
    // Common
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
    nameEn: 'ឈ្មោះ (អង់គ្លេស)',
    nameKh: 'ឈ្មោះ (ខ្មែរ)',
    idNumber: 'លេខសម្គាល់',
    gender: 'ភេទ',
    position: 'តួនាទី',
    positionEn: 'តួនាទី (អង់គ្លេស)',
    positionKh: 'តួនាទី (ខ្មែរ)',
    partyBranch: 'សាខាគណបក្ស',
    partyBranchEn: 'សាខាគណបក្ស (អង់គ្លេស)',
    partyBranchKh: 'សាខាគណបក្ស (ខ្មែរ)',
    phone: 'ទូរស័ព្ទ',
    dateRegistration: 'កាលបរិច្ឆេទចុះឈ្មោះ',
    profilePicture: 'រូបភាព',
    attachments: 'ឯកសារភ្ជាប់',
    
    // Gender options
    male: 'ប្រុស',
    female: 'ស្រី',
    other: 'ផ្សេងទៀត',
    
    // Status
    active: 'សកម្ម',
    inactive: 'អសកម្ម',
    
    // Messages
    success: 'ជោគជ័យ',
    error: 'កំហុស',
    warning: 'ការព្រមាន',
    info: 'ព័ត៌មាន',
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // Load saved language from localStorage
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
    return translations[language][key as keyof typeof translations['en']] || key
  }

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}