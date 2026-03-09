'use client'

import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast } = useApp()
  return toast ? (
  <div className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto slide-up">
    <div className={`p-3 rounded-xl text-sm font-medium text-center shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-pink-500 text-white'}`}>
      {toast.msg}
    </div>
  </div>
  ) : null
}
