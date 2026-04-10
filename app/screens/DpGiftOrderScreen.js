'use client'
import { useApp } from '../context/AppContext'
import { SCREENS } from '../lib/constants'
import { ArrowLeft, MapPin, Phone, Package, CheckCircle, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_STEPS = ['assigned', 'en_route', 'arrived', 'delivered']
const STATUS_LABELS = { assigned: 'Assigned', en_route: 'En Route', arrived: 'Arrived', delivered: 'Delivered' }

function buildGiftMapsUrl(o) {
  if (o?.delivery_lat && o?.delivery_lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}&travelmode=driving`
  }
  const addr = [o?.delivery_address, o?.delivery_landmark].filter(Boolean).join(', ')
  if (addr) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
  return 'https://www.google.com/maps'
}

export default function DpGiftOrderScreen() {
  const { dpSelectedGiftOrder: o, handleUpdateGiftStatus, navigate, loading, showToast } = useApp()

  if (!o) return null

  const currentIdx = STATUS_STEPS.indexOf(o.delivery_status)

  const getNextAction = () => {
    if (o.delivery_status === 'assigned') return { label: '🚗 Start Navigation', next: 'en_route' }
    if (o.delivery_status === 'en_route') return { label: '📍 Arrived at Location', next: 'arrived' }
    if (o.delivery_status === 'arrived') return { label: '✅ Gift Delivered', next: 'delivered' }
    return null
  }

  const action = getNextAction()

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(SCREENS.DP_HOME)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">🎁 Gift Delivery</h1>
            <p className="text-xs text-gray-400 capitalize">{o.delivery_status?.replace('_', ' ')}</p>
          </div>
          <div className="ml-auto">
            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-xl">100% Paid</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Progress */}
        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1
                    ${i <= currentIdx ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {i < currentIdx ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] text-center ${i <= currentIdx ? 'text-pink-600 font-semibold' : 'text-gray-400'}`}>
                    {STATUS_LABELS[step]}
                  </span>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`absolute h-0.5 w-full -z-10 top-4 ${i < currentIdx ? 'bg-pink-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gift Items */}
        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-pink-500" />
              <h3 className="font-bold text-sm text-gray-700">Gift Items to Deliver</h3>
            </div>
            {(o.gift_items || []).map((g, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{g.quantity}× {g.name}</span>
                <span className="text-sm font-semibold text-pink-600">₹{(g.price * g.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-pink-100 flex justify-between font-bold">
              <span className="text-sm text-gray-800">Total Value</span>
              <span className="text-sm text-pink-600">₹{o.gift_total?.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="rounded-2xl border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-gray-700 mb-1">Delivery Address</p>
                <p className="text-sm text-gray-600">{o.delivery_address}</p>
                {o.delivery_landmark && <p className="text-xs text-gray-400 mt-0.5">Landmark: {o.delivery_landmark}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer */}
        {o.customer && (
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-4">
              <p className="font-bold text-sm text-gray-700 mb-2">Customer</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{o.customer.name}</p>
                  <p className="text-xs text-gray-400">{o.customer.phone || o.customer.email}</p>
                </div>
                {o.customer.phone && (
                  <a href={`tel:${o.customer.phone}`}
                    className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-2 rounded-xl text-green-600 text-sm font-semibold">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Slot */}
        {o.delivery_slot && (
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-4">
              <p className="font-bold text-sm text-gray-700 mb-1">Scheduled Slot</p>
              <p className="text-sm text-gray-600">{o.delivery_slot.date} · {o.delivery_slot.hour}:00 – {o.delivery_slot.hour + 1}:00</p>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {action && o.delivery_status !== 'delivered' && (
          <div className="space-y-2">
            {/* When en_route, show a secondary "Reopen Maps" button */}
            {o.delivery_status === 'en_route' && (
              <Button
                onClick={() => { try { window.open(buildGiftMapsUrl(o), '_blank', 'noopener,noreferrer') } catch {} }}
                variant="outline"
                className="w-full border-pink-200 text-pink-600 font-semibold py-3 rounded-2xl"
              >
                <Navigation className="w-4 h-4 mr-2" /> Reopen Google Maps
              </Button>
            )}
            <Button
              onClick={async () => {
                await handleUpdateGiftStatus(o.id, action.next)
                // Open Google Maps when starting delivery
                if (action.next === 'en_route') {
                  try { window.open(buildGiftMapsUrl(o), '_blank', 'noopener,noreferrer') } catch {}
                }
              }}
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl text-base"
            >
              {loading ? 'Updating...' : action.label}
            </Button>
          </div>
        )}

        {o.delivery_status === 'delivered' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-green-700">Gift Delivered!</p>
            <p className="text-xs text-green-500 mt-1">Order complete — payment already received</p>
          </div>
        )}
      </div>
    </div>
  )
}
