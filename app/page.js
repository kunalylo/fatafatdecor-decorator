'use client'

import { AppProvider } from './context/AppContext'
import { useApp } from './context/AppContext'
import { SCREENS } from './lib/constants'
import Toast from './components/Toast'
import DpBottomNav from './components/DpBottomNav'
import DpAuthScreen from './screens/DpAuthScreen'
import DpHomeScreen from './screens/DpHomeScreen'
import DpOrderScreen from './screens/DpOrderScreen'
import DpVerifyScreen from './screens/DpVerifyScreen'
import DpActiveJobScreen from './screens/DpActiveJobScreen'
import DpCalendarScreen from './screens/DpCalendarScreen'
import DpEarningsScreen from './screens/DpEarningsScreen'
import DpProfileScreen from './screens/DpProfileScreen'

function AppContent() {
  const { screen, dpUser } = useApp()
  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative overflow-hidden">
      <Toast />
      {screen === SCREENS.DP_AUTH && <DpAuthScreen />}
      {screen === SCREENS.DP_HOME && <DpHomeScreen />}
      {screen === SCREENS.DP_ORDER && <DpOrderScreen />}
      {screen === SCREENS.DP_VERIFY && <DpVerifyScreen />}
      {screen === SCREENS.DP_ACTIVE_JOB && <DpActiveJobScreen />}
      {screen === SCREENS.DP_CALENDAR && <DpCalendarScreen />}
      {screen === SCREENS.DP_EARNINGS && <DpEarningsScreen />}
      {screen === SCREENS.DP_PROFILE && <DpProfileScreen />}
      {dpUser && screen !== SCREENS.DP_AUTH && screen !== SCREENS.DP_VERIFY && screen !== SCREENS.DP_ACTIVE_JOB && <DpBottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
