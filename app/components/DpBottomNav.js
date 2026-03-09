'use client'

import { Home, Calendar, Wallet, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS } from '../lib/constants'

export default function DpBottomNav() {
  const { screen, navigate } = useApp()
  const navItems = [
    { screen: SCREENS.DP_HOME, icon: Home, label: 'Dashboard' },
    { screen: SCREENS.DP_CALENDAR, icon: Calendar, label: 'Calendar' },
    { screen: SCREENS.DP_EARNINGS, icon: Wallet, label: 'Earnings' },
    { screen: SCREENS.DP_PROFILE, icon: User, label: 'Profile' }
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map(item => (
            <button key={item.label} onClick={() => navigate(item.screen)}
              className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all ${screen === item.screen ? 'text-pink-500' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
