'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Sparkles, CheckCircle2, Plus, Navigation, ScanFace,
  Timer, Wallet, CreditCard, Phone
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS, api } from '../lib/constants'

export default function DpOrderScreen() {
  const {
    dpSelectedOrder, setDpSelectedOrder, dpUser, loading, dpTimerSeconds,
    navigate, showToast, formatTimer, setDpActiveTimer, setDpTimerSeconds, dpTimerRef
  } = useApp()
  const o = dpSelectedOrder
  if (!o) return null
  const needsFaceScan = o.delivery_status === 'assigned' || o.delivery_status === 'en_route'
  const needsOtp = o.delivery_status === 'arrived' && o.face_scan
  const isDecorating = o.delivery_status === 'decorating'
  const isComplete = o.delivery_status === 'delivered'

  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.DP_HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Order #{o.id?.slice(0, 8)}</h1>
      </div>
      <div className="px-4 space-y-4">
        {/* Kit Name - Prominent for Decorator */}
        {o.kit_name && (
          <Card className="border-2 border-pink-300 bg-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-pink-500" />
                <span className="text-xs font-semibold text-pink-400 uppercase">Collect This Kit</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">{o.kit_name}</h2>
            </CardContent>
          </Card>
        )}

        {o.decorated_image && (
          <img src={o.decorated_image} alt="Design" className="w-full h-40 object-cover rounded-xl border border-pink-100" />
        )}
        <Card className="border border-gray-100">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Customer</span><span className="text-sm font-semibold text-gray-700">{o.customer?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Phone</span><a href={`tel:${o.customer?.phone}`} className="text-sm font-semibold text-pink-500">{o.customer?.phone}</a></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Slot</span><span className="text-sm">{o.delivery_slot?.date} at {o.delivery_slot?.hour}:00</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Total</span><span className="text-sm font-bold text-pink-500">Rs {o.total_cost}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Payment</span><Badge className="capitalize">{o.payment_status}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Status</span><Badge className={`capitalize ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>{o.delivery_status}</Badge></div>
          </CardContent>
        </Card>

        {/* Kit Items */}
        {(o.kit_items || []).length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-pink-600 mb-2">Kit Items to Collect</h3>
            {o.kit_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                <div className="w-5 h-5 rounded border-2 border-pink-300 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-pink-400" /></div>
                <span className="text-xs text-gray-600 flex-1">{item.quantity}x {item.name} {item.color ? `(${item.color})` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add-on Items */}
        {(o.addon_items || []).length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-purple-600 mb-2">Additional Single Items</h3>
            {o.addon_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                <Plus className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-600 flex-1">{item.quantity}x {item.name} {item.color ? `(${item.color})` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fallback items list */}
        {!(o.kit_items?.length) && !(o.addon_items?.length) && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2">Items Checklist</h3>
            {(o.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-600 flex-1">{item.name} {item.color ? `(${item.color})` : ''}</span>
                <span className="text-xs text-gray-400">x{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status Actions */}
        {o.delivery_status === 'assigned' && (
          <Button onClick={async () => {
            await api('dp/update-status', { method: 'POST', body: { order_id: o.id, status: 'en_route', dp_id: dpUser?.id } })
            await api('dp/generate-otp', { method: 'POST', body: { order_id: o.id } })
            setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'en_route' }))
            showToast('On your way! OTP generated for customer.', 'success')
          }} className="w-full h-14 gradient-pink border-0 text-white font-bold rounded-2xl shadow-pink">
            <Navigation className="w-5 h-5 mr-2" /> Start Navigation / En Route
          </Button>
        )}

        {o.delivery_status === 'en_route' && (
          <Button onClick={() => { navigate(SCREENS.DP_VERIFY) }} className="w-full h-14 gradient-pink border-0 text-white font-bold rounded-2xl shadow-pink">
            <ScanFace className="w-5 h-5 mr-2" /> Arrived - Verify Identity
          </Button>
        )}

        {isDecorating && (
          <Card className="border-2 border-orange-300 bg-orange-50">
            <CardContent className="p-4 text-center">
              <Timer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-orange-600">{formatTimer(dpTimerSeconds)}</p>
              <p className="text-xs text-orange-400 mb-3">Decoration in progress</p>
              <Button onClick={async () => {
                await api('dp/complete', { method: 'POST', body: { order_id: o.id, dp_id: dpUser?.id } })
                try { localStorage.removeItem('fd_dp_timer') } catch {}
                setDpActiveTimer(null); setDpTimerSeconds(0)
                setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'delivered' }))
                showToast('Job completed!', 'success')
              }} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Completed
              </Button>
            </CardContent>
          </Card>
        )}

        {isComplete && o.payment_status !== 'full' && (
          <Card className="border border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Collect Remaining Payment</h3>
              <p className="text-xs text-gray-400 mb-3">Remaining: Rs {Math.round(o.total_cost * 0.5)}</p>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  await api('dp/collect-payment', { method: 'POST', body: { order_id: o.id, dp_id: dpUser?.id, amount: Math.round(o.total_cost * 0.5), method: 'cash' } })
                  setDpSelectedOrder(prev => ({ ...prev, payment_status: 'full' }))
                  showToast('Cash collected!', 'success')
                }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl">
                  <Wallet className="w-4 h-4 mr-1" /> Cash
                </Button>
                <Button onClick={async () => {
                  await api('dp/collect-payment', { method: 'POST', body: { order_id: o.id, dp_id: dpUser?.id, amount: Math.round(o.total_cost * 0.5), method: 'online' } })
                  setDpSelectedOrder(prev => ({ ...prev, payment_status: 'full' }))
                  showToast('Online payment recorded!', 'success')
                }} variant="outline" className="flex-1 border-pink-200 text-pink-500 font-semibold rounded-xl">
                  <CreditCard className="w-4 h-4 mr-1" /> Online
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {o.customer?.phone && (
          <a href={`tel:${o.customer.phone}`} className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border border-green-200">
            <Phone className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-600">Call Customer</span>
          </a>
        )}
      </div>
    </div>
  )
}
