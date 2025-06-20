import React from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

interface MessageAlertProps {
  message: { type: 'success' | 'error', text: string } | null
  onClose: () => void
}

export function MessageAlert({ message, onClose }: MessageAlertProps) {
  if (!message) return null

  return (
    <div className={`p-4 rounded-lg border ${
      message.type === 'success' 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
        <button
          onClick={onClose}
          className={`ml-4 p-1 rounded-md transition-colors ${
            message.type === 'success'
              ? 'text-green-400 hover:text-green-600'
              : 'text-red-400 hover:text-red-600'
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}