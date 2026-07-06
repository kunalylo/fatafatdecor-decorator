'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Sparkles, CheckCircle2, Plus, Navigation, Camera,
  Timer, Wallet, CreditCard, Phone, MapPin, Copy, Upload, Trash2, ImagePlus, Loader2
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS, api } from '../lib/constants'

// Build a Google Maps directions URL — prefers precise lat/lng from the
// customer's pinned address, falls back to a text address, and finally to
// a plain search if nothing is set.
function buildMapsUrl(o) {
  const lat = o?.delivery_lat ?? o?.delivery_location?.lat
  const lng = o?.delivery_lng ?? o?.delivery_location?.lng
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
  }
  const addr = [o?.delivery_address, o?.delivery_landmark].filter(Boolean).join(', ')
  if (addr) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
  return 'https://www.google.com/maps'
}

export default function DpOrderScreen() {
  const {
    dpSelectedOrder, setDpSelectedOrder, dpUser, loading, dpTimerSeconds,
    navigate, showToast, formatTimer, setDpActiveTimer, setDpTimerSeconds, dpTimerRef, extendTimer
  } = useApp()
  const o = dpSelectedOrder
  if (!o) return null
  const isDecorating = o.delivery_status === 'decorating'
  const isComplete   = o.delivery_status === 'delivered'

  // Reference-flow orders show the source design photo as the "target to recreate".
  // Customer prices are hidden — decorator only sees procurement quantities.
  const isReferenceFlow = o.flow === 'reference' || !!o.reference_design_id
  const referenceImage  = o.reference_image_url || o.reference_thumbnail_url
  // Remaining to collect = total - already paid (50%)
  const remainingToCollect = Math.max(0, Math.round((o.total_cost || 0) - (o.payment_amount || 0)))

  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.DP_HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Order #{o.id?.slice(0, 8)}</h1>
      </div>
      <div className="px-4 space-y-4">

        {/* REFERENCE FLOW: Show the reference image as the "target to recreate" */}
        {isReferenceFlow && referenceImage && (
          <Card className="border-2 border-pink-300 bg-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                <span className="text-xs font-semibold text-pink-500 uppercase tracking-wide">Recreate This Look</span>
              </div>
              <img src={referenceImage} alt="Reference target" className="w-full rounded-xl border border-pink-200 bg-white" />
              <p className="text-[11px] text-gray-500 mt-2 text-center">This is what the customer expects — match the style</p>
            </CardContent>
          </Card>
        )}

        {/* Kit Name - Prominent for Decorator (legacy kit flow only) */}
        {!isReferenceFlow && o.kit_name && (
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

        {/* Three-image grid for reference flow:
            REFERENCE (target) · ORIGINAL ROOM (canvas) · AI PREVIEW (what customer expects) */}
        {isReferenceFlow ? (
          <Card className="border border-gray-100">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Job References</p>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Reference (target style) */}
                <div className="space-y-1">
                  <div className="aspect-square overflow-hidden rounded-lg border-2 border-pink-300 bg-pink-50">
                    {referenceImage ? (
                      <img src={referenceImage} alt="Reference" className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => window.open(referenceImage, '_blank')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-pink-600 uppercase text-center leading-tight">Reference<br/>(target)</p>
                </div>
                {/* 2. Original room photo (customer's actual space) */}
                <div className="space-y-1">
                  <div className="aspect-square overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50">
                    {o.original_image_url ? (
                      <img src={o.original_image_url} alt="Customer's room" className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => window.open(o.original_image_url, '_blank')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No photo</div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-blue-600 uppercase text-center leading-tight">Customer<br/>Room</p>
                </div>
                {/* 3. AI preview (what was generated for customer) */}
                <div className="space-y-1">
                  <div className="aspect-square overflow-hidden rounded-lg border-2 border-purple-300 bg-purple-50">
                    {o.decorated_image ? (
                      <img src={o.decorated_image} alt="AI preview" className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => window.open(o.decorated_image, '_blank')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-purple-600 uppercase text-center leading-tight">AI Preview<br/>(customer view)</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center italic">Tap any image to enlarge</p>
            </CardContent>
          </Card>
        ) : (
          /* Legacy kit flow — single decorated image */
          o.decorated_image && (
            <img src={o.decorated_image} alt="Design" className="w-full h-40 object-cover rounded-xl border border-pink-100" />
          )
        )}
        <Card className="border border-gray-100">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Customer</span><span className="text-sm font-semibold text-gray-700">{o.customer?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Phone</span><a href={`tel:${o.customer?.phone}`} className="text-sm font-semibold text-pink-500">{o.customer?.phone}</a></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Slot</span><span className="text-sm">{o.delivery_slot ? `${o.delivery_slot.date} · ${o.delivery_slot.hour}:00–${o.delivery_slot.hour + 2}:00` : '—'}</span></div>
            {/* Decorators never see the order total — only what they must collect on delivery. */}
            <div className="flex justify-between items-center bg-green-50 -mx-1 px-3 py-2 rounded-lg border border-green-200">
              <span className="text-sm font-semibold text-green-700">Collect on delivery</span>
              <span className="text-base font-bold text-green-600">
                {remainingToCollect > 0 ? `Rs ${remainingToCollect.toLocaleString('en-IN')}` : 'Nothing — prepaid'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Payment</span><Badge className="capitalize">{o.payment_status}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Status</span><Badge className={`capitalize ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>{o.delivery_status}</Badge></div>
          </CardContent>
        </Card>

        {/* Delivery Address — always visible */}
        {(o.delivery_address || o.delivery_lat) && (
          <Card className="border border-blue-100 bg-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-700 mb-0.5">Delivery Address</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{o.delivery_address || 'Pin location only'}</p>
                  {o.delivery_landmark && <p className="text-xs text-gray-400 mt-0.5">Landmark: {o.delivery_landmark}</p>}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const text = [o.delivery_address, o.delivery_landmark].filter(Boolean).join(', ')
                    if (text && navigator.clipboard) { navigator.clipboard.writeText(text); showToast('Address copied', 'success') }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-blue-100 shrink-0"
                  title="Copy address"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
              {/* Quick Maps link */}
              <button
                onClick={() => { try { window.open(buildMapsUrl(o), '_blank', 'noopener,noreferrer') } catch {} }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold"
              >
                <Navigation className="w-4 h-4" /> Open in Google Maps
              </button>
            </CardContent>
          </Card>
        )}

        {/* REFERENCE FLOW: clean procurement checklist (no prices, grouped by category) */}
        {isReferenceFlow ? (
          (() => {
            const items = o.items || []
            if (items.length === 0) return null
            // Group by category for cleaner browsing
            const grouped = items.reduce((acc, item) => {
              const cat = item.category || 'Other'
              if (!acc[cat]) acc[cat] = []
              acc[cat].push(item)
              return acc
            }, {})
            const totalUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
            return (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-sm text-pink-600">Procurement Checklist</h3>
                  <span className="text-[10px] text-gray-400">{totalUnits} units · {items.length} SKUs</span>
                </div>
                {Object.entries(grouped).map(([category, list]) => (
                  <div key={category} className="mb-3">
                    <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wide mb-1">{category}</p>
                    {list.map((item, i) => (
                      <div key={item.id || `${category}-${i}`} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                        <div className="w-5 h-5 rounded border-2 border-pink-300 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-pink-400" />
                        </div>
                        <span className="text-xs text-gray-700 flex-1">
                          <strong>{item.quantity}×</strong> {item.name}
                        </span>
                        {item.matched_sku_code && (
                          <span className="text-[9px] font-mono text-gray-400 truncate max-w-[140px]">{item.matched_sku_code}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
          <>
            {/* LEGACY KIT FLOW: Kit + Addon items shown separately */}
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
          </>
        )}

        {/* Gift Items (when decoration order also has gifts) */}
        {o.has_gifts && o.gift_items?.length > 0 && (
          <Card className="mx-0 mb-3 rounded-2xl border-pink-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎁</span>
                <h3 className="font-bold text-sm text-gray-700">Also Deliver These Gifts</h3>
                <span className="bg-pink-100 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full">With Decoration</span>
              </div>
              {o.gift_items.map((g, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{g.quantity}× {g.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completion Photos — available once decorator has arrived. Customer + admin see these. */}
        {['arrived', 'decorating', 'delivered', 'completed'].includes(o.delivery_status) && (
          <CompletionPhotosCard order={o} setDpSelectedOrder={setDpSelectedOrder} showToast={showToast} />
        )}

        {/* Status Actions */}
        {o.delivery_status === 'assigned' && (
          <div className="space-y-2">
            <Button
              onClick={async () => {
                const upd = await api('dp/update-status', { method: 'POST', body: { order_id: o.id, status: 'en_route' } })
                if (upd?.error) { showToast(upd.error, 'error'); return }
                const otpRes = await api('dp/generate-otp', { method: 'POST', body: { order_id: o.id } })
                if (otpRes?.error) { showToast(otpRes.error, 'error'); return }
                setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'en_route' }))
                showToast('On your way! OTP sent to customer.', 'success')
                // Open Google Maps in a new tab for navigation
                try { window.open(buildMapsUrl(o), '_blank', 'noopener,noreferrer') } catch {}
              }}
              className="w-full h-14 gradient-pink border-0 text-white font-bold rounded-2xl shadow-pink"
            >
              <Navigation className="w-5 h-5 mr-2" /> Start Navigation &amp; Notify Customer
            </Button>
          </div>
        )}

        {o.delivery_status === 'en_route' && (
          <div className="space-y-2">
            <Button
              onClick={() => { try { window.open(buildMapsUrl(o), '_blank', 'noopener,noreferrer') } catch {} }}
              variant="outline"
              className="w-full h-12 border-pink-200 text-pink-600 font-semibold rounded-2xl"
            >
              <Navigation className="w-4 h-4 mr-2" /> Reopen Google Maps
            </Button>
            <Button
              onClick={() => { navigate(SCREENS.DP_VERIFY) }}
              className="w-full h-14 gradient-pink border-0 text-white font-bold rounded-2xl shadow-pink"
            >
              <Camera className="w-5 h-5 mr-2" /> Arrived — Check In with Selfie
            </Button>
          </div>
        )}

        {isDecorating && (
          <Card className="border-2 border-orange-300 bg-orange-50">
            <CardContent className="p-4 text-center">
              <Timer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-orange-600">{formatTimer(dpTimerSeconds)}</p>
              <p className="text-xs text-orange-400 mb-3">Decoration in progress</p>
              <div className="flex gap-2">
                <button onClick={extendTimer} className="px-3 rounded-xl border-2 border-orange-300 text-orange-600 text-sm font-bold hover:bg-orange-100">
                  ＋ 5 min
                </button>
                <Button onClick={async () => {
                  const r = await api('dp/complete', { method: 'POST', body: { order_id: o.id } })
                  if (r?.error) { showToast(r.error, 'error'); return }
                  try { localStorage.removeItem('fd_dp_timer') } catch {}
                  setDpActiveTimer(null); setDpTimerSeconds(0)
                  setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'delivered' }))
                  showToast('Job completed!', 'success')
                }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Completed
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isComplete && o.payment_status !== 'full' && (
          <Card className="border border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Collect Remaining Payment</h3>
              {(() => {
                const remaining = Math.round(o.total_cost - (o.payment_amount || 0))
                return (<>
              <p className="text-xs text-gray-400 mb-3">Remaining: Rs {remaining} (50% on delivery)</p>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  const r = await api('dp/collect-payment', { method: 'POST', body: { order_id: o.id, amount: remaining, method: 'cash' } })
                  if (r?.error) { showToast(r.error, 'error'); return }
                  setDpSelectedOrder(prev => ({ ...prev, payment_status: 'full' }))
                  showToast('Cash collected!', 'success')
                }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl">
                  <Wallet className="w-4 h-4 mr-1" /> Cash
                </Button>
                <Button onClick={async () => {
                  try {
                    const ord = await api('dp/collect-payment/create-online', { method: 'POST', body: { order_id: o.id } })
                    if (ord?.error) { showToast(ord.error, 'error'); return }
                    if (!window.Razorpay) { showToast('Payment gateway still loading, try again', 'error'); return }
                    const rzp = new window.Razorpay({
                      key: ord.razorpay_key_id,
                      amount: ord.amount,
                      currency: 'INR',
                      name: 'FatafatDecor',
                      description: `Remaining payment · Order #${o.id.slice(0, 8)}`,
                      order_id: ord.razorpay_order_id,
                      prefill: { name: o.customer?.name || '', contact: o.customer?.phone || '' },
                      theme: { color: '#EC4899' },
                      handler: async (resp) => {
                        const v = await api('dp/collect-payment/verify-online', {
                          method: 'POST',
                          body: {
                            razorpay_order_id: resp.razorpay_order_id,
                            razorpay_payment_id: resp.razorpay_payment_id,
                            razorpay_signature: resp.razorpay_signature,
                          },
                        })
                        if (v?.error) { showToast(v.error, 'error'); return }
                        setDpSelectedOrder(prev => ({ ...prev, payment_status: 'full' }))
                        showToast('Online payment received!', 'success')
                      },
                      modal: { ondismiss: () => showToast('Payment cancelled', 'error') },
                    })
                    rzp.open()
                  } catch (e) { showToast('Could not start online payment', 'error') }
                }} variant="outline" className="flex-1 border-pink-200 text-pink-500 font-semibold rounded-xl">
                  <CreditCard className="w-4 h-4 mr-1" /> Online
                </Button>
              </div>
                </>)
              })()}
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

// Compresses a File to a JPEG data URL, max edge `maxPx` (defaults to 1280),
// quality 0.82. Keeps payload reasonable for the JSON upload endpoint.
async function compressToDataURL(file, maxPx = 1280, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Image decode failed'))
    i.src = dataUrl
  })
  let { width: w, height: h } = img
  if (Math.max(w, h) > maxPx) {
    const scale = maxPx / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

function CompletionPhotosCard({ order, setDpSelectedOrder, showToast }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const photos = Array.isArray(order.completion_photos) ? order.completion_photos : []

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (files.length > 6) {
      showToast('Max 6 photos per upload', 'error')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const compressed = await Promise.all(files.map(f => compressToDataURL(f).catch(() => null)))
      const validPhotos = compressed.filter(Boolean)
      if (validPhotos.length === 0) {
        showToast('Could not read any of the selected photos', 'error')
        return
      }
      const res = await api('dp/completion-photos', { method: 'POST', body: { order_id: order.id, photos: validPhotos } })
      if (res.error) { showToast(res.error, 'error'); return }
      const newPhotos = res.photos || []
      setDpSelectedOrder(prev => ({
        ...prev,
        completion_photos: [...(prev.completion_photos || []), ...newPhotos],
      }))
      showToast(`Uploaded ${res.uploaded} photo${res.uploaded === 1 ? '' : 's'}`, 'success')
    } catch (e) {
      showToast('Upload failed: ' + e.message, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = async (idx) => {
    if (!confirm('Remove this photo?')) return
    const res = await api(`dp/completion-photos/${order.id}/${idx}`, { method: 'DELETE' })
    if (res.error) { showToast(res.error, 'error'); return }
    setDpSelectedOrder(prev => ({
      ...prev,
      completion_photos: (prev.completion_photos || []).filter((_, i) => i !== idx),
    }))
    showToast('Photo removed', 'success')
  }

  return (
    <Card className="border border-emerald-200 bg-emerald-50/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-emerald-700">Completion Photos</h3>
          {photos.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{photos.length}</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Upload 2-4 clear photos of the finished decoration. These are shared with the customer + admin so payment can be released.
        </p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((p, i) => (
              <div key={p.url || i} className="relative aspect-square rounded-lg overflow-hidden border border-emerald-200 bg-white">
                <img src={p.url} alt={`Completion ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => window.open(p.url, '_blank')} />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={onPick}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            : <><ImagePlus className="w-4 h-4" /> {photos.length > 0 ? 'Add More Photos' : 'Upload Photos'}</>}
        </Button>
      </CardContent>
    </Card>
  )
}
