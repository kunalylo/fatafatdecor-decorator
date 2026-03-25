'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Timer, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS, api } from '../lib/constants'

export default function DpActiveJobScreen() {
  const {
    dpUser, dpSelectedOrder, setDpSelectedOrder, dpTimerSeconds, setDpActiveTimer,
    setDpTimerSeconds, dpTimerRef, navigate, showToast, formatTimer
  } = useApp()
  const o = dpSelectedOrder
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.DP_HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Active Job</h1>
      </div>
      <div className="px-4 space-y-4">
        <Card className={`border-2 ${dpTimerSeconds < 300 ? 'border-red-400 bg-red-50' : dpTimerSeconds < 900 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
          <CardContent className="p-6 text-center">
            <Timer className={`w-12 h-12 mx-auto mb-2 ${dpTimerSeconds < 300 ? 'text-red-500' : dpTimerSeconds < 900 ? 'text-orange-500' : 'text-green-500'}`} />
            <p className={`text-4xl font-bold ${dpTimerSeconds < 300 ? 'text-red-600' : dpTimerSeconds < 900 ? 'text-orange-600' : 'text-green-600'}`}>{formatTimer(dpTimerSeconds)}</p>
            <p className="text-sm text-gray-400 mt-1">Time Remaining</p>
            {dpTimerSeconds < 300 && dpTimerSeconds > 0 && (
              <div className="mt-2 flex items-center justify-center gap-1 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold">Less than 5 minutes!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {o && (
          <Card className="border border-gray-100">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-400 text-sm">Order</span><span className="text-sm font-mono">#{o.id?.slice(0, 8)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">Customer</span><span className="text-sm">{o.customer?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">Total</span><span className="text-sm font-bold text-pink-500">Rs {o.total_cost}</span></div>
            </CardContent>
          </Card>
        )}

        <Button onClick={async () => {
          if (!o) return
          await api('dp/complete', { method: 'POST', body: { order_id: o.id, dp_id: dpUser?.id } })
          setDpActiveTimer(null); setDpTimerSeconds(0)
          if (dpTimerRef.current) clearInterval(dpTimerRef.current)
          try { localStorage.removeItem('fd_dp_timer') } catch {}
          setDpSelectedOrder(prev => prev ? ({ ...prev, delivery_status: 'delivered' }) : prev)
          showToast('Job completed!', 'success')
          navigate(SCREENS.DP_ORDER)
        }} className="w-full h-14 bg-green-500 hover:bg-green-600 border-0 text-white font-bold rounded-2xl">
          <CheckCircle2 className="w-5 h-5 mr-2" /> Complete Decoration
        </Button>
      </div>
    </div>
  )
}
