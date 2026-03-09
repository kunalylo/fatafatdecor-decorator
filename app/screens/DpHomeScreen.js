'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Star, RefreshCw, Timer, Calendar, PlayCircle, Package,
  CheckCircle2, Trash2, Clock, ChevronRight, Truck
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS, api } from '../lib/constants'

export default function DpHomeScreen() {
  const {
    dpUser, dpDashboard, dpOrders, setDpOrders, dpActiveTimer, dpTimerSeconds,
    pendingOrders, loading, navigate, refreshDashboard, handleAcceptOrder,
    handleDeclineOrder, formatTimer, setDpSelectedOrder
  } = useApp()
  const today = dpDashboard?.date || new Date().toISOString().split('T')[0]
  const todayOrders = dpDashboard?.today_orders || []
  const activeOrders = dpDashboard?.active_orders || []
  const refreshDp = () => {
    refreshDashboard(dpUser.id)
    api(`dp/orders/${dpUser.id}`).then(d => { if (!d.error) setDpOrders(d) })
  }
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="gradient-pink p-6 pb-10 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white/70 text-xs">Decorator</p>
            <h1 className="text-white text-xl font-bold">{dpUser?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0">
              <Star className="w-3 h-3 mr-1" />{dpUser?.rating || '4.8'}
            </Badge>
            <button onClick={refreshDp} className="bg-white/20 rounded-full p-2"><RefreshCw className="w-4 h-4 text-white" /></button>
          </div>
        </div>
      </div>

      {dpActiveTimer && (
        <div className="px-4 -mt-6 mb-3">
          <Card className="border-2 border-orange-400 bg-orange-50">
            <CardContent className="p-4 text-center" onClick={() => navigate(SCREENS.DP_ACTIVE_JOB)}>
              <Timer className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">{formatTimer(dpTimerSeconds)}</p>
              <p className="text-xs text-orange-400">Active Job - Tap to view</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={`px-4 ${dpActiveTimer ? '' : '-mt-6'}`}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: todayOrders.length, icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-50' },
            { label: 'Active', value: activeOrders.length, icon: PlayCircle, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Total', value: dpUser?.total_deliveries || dpOrders.length, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' }
          ].map((s, i) => (
            <Card key={i} className="border border-gray-100 shadow-sm">
              <CardContent className="p-3 text-center">
                <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mx-auto mb-1`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                <p className="text-lg font-bold text-gray-800">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ===== NEW INCOMING ORDER REQUESTS ===== */}
      {pendingOrders.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <h2 className="font-bold text-base text-gray-800">New Order Requests</h2>
            <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
          </div>
          {pendingOrders.map(o => (
            <Card key={o.id} className="border-2 border-green-300 bg-green-50 mb-3 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Order #{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.delivery_address || 'Address not set'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Received just now</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-base">Rs {o.total_cost}</p>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">NEW</span>
                  </div>
                </div>
                {(o.items || []).length > 0 && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                    Items: {(o.items || []).slice(0, 3).map(i => i.name).join(', ')}{o.items.length > 3 ? ` +${o.items.length - 3} more` : ''}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    disabled={loading}
                    onClick={() => handleAcceptOrder(o.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl h-11 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept
                  </Button>
                  <Button
                    disabled={loading}
                    onClick={() => handleDeclineOrder(o.id)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-500 hover:bg-red-50 font-bold rounded-xl h-11 text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="px-4 mt-4">
        <h2 className="font-bold text-base text-gray-800 mb-3">Today's Schedule</h2>
        {todayOrders.length === 0 ? (
          <Card className="border border-gray-100"><CardContent className="p-6 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No deliveries today</p></CardContent></Card>
        ) : todayOrders.map(o => (
          <Card key={o.id} className="border border-gray-100 mb-2 cursor-pointer hover:shadow-md" onClick={async () => {
            const detail = await api(`dp/order-detail/${o.id}`)
            if (!detail.error) { setDpSelectedOrder(detail); navigate(SCREENS.DP_ORDER) }
          }}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${o.delivery_status === 'delivered' ? 'bg-green-50' : o.delivery_status === 'decorating' ? 'bg-orange-50' : 'bg-pink-50'}`}>
                {o.delivery_status === 'delivered' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-pink-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{o.delivery_slot?.hour}:00 - {o.delivery_slot?.hour + 1}:00</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-pink-500">Rs {o.total_cost}</p>
                <Badge className={`text-[9px] capitalize ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : o.delivery_status === 'decorating' ? 'bg-orange-100 text-orange-600' : 'bg-pink-100 text-pink-600'}`}>{o.delivery_status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeOrders.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="font-bold text-base text-gray-800 mb-3">Active Orders</h2>
          {activeOrders.map(o => (
            <Card key={o.id} className="border-2 border-pink-200 mb-2 cursor-pointer" onClick={async () => {
              const detail = await api(`dp/order-detail/${o.id}`)
              if (!detail.error) { setDpSelectedOrder(detail); navigate(SCREENS.DP_ORDER) }
            }}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center"><Truck className="w-5 h-5 text-pink-500" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{o.delivery_slot?.date} at {o.delivery_slot?.hour}:00</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
