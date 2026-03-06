'use client'

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Home, Camera, MapPin, ShoppingBag, User, ChevronLeft, Sparkles, Clock,
  CreditCard, Star, Truck, Phone, Loader2, LogOut, Image,
  Package, ArrowRight, Zap, ChevronRight, IndianRupee, RefreshCw,
  Settings, Plus, Trash2, Navigation, CheckCircle2, Edit3,
  Calendar, DollarSign, Shield, Bell, ScanFace, KeyRound, PlayCircle,
  StopCircle, Wallet, Building2, Timer, AlertTriangle, ChevronDown
} from 'lucide-react'

const SCREENS = {
  AUTH: 'auth', HOME: 'home', UPLOAD: 'upload', GENERATING: 'generating',
  DESIGN: 'design', BOOKING: 'booking', TRACKING: 'tracking', CREDITS: 'credits',
  ORDERS: 'orders', PROFILE: 'profile', ADMIN: 'admin', ORDER_DETAIL: 'order_detail',
  // Decorator/Delivery Person Screens
  DP_AUTH: 'dp_auth', DP_HOME: 'dp_home', DP_ORDER: 'dp_order',
  DP_CALENDAR: 'dp_calendar', DP_EARNINGS: 'dp_earnings', DP_PROFILE: 'dp_profile',
  DP_VERIFY: 'dp_verify', DP_ACTIVE_JOB: 'dp_active_job'
}
const ROOM_TYPES = ['Dining Room', 'Living Room', 'Bedroom', 'Balcony', 'Garden', 'Hall', 'Office', 'Terrace']
const OCCASIONS = ['birthday', 'anniversary', 'wedding', 'dinner', 'party', 'baby_shower', 'engagement', 'corporate', 'festival', 'housewarming']
const BUDGET_BRACKETS = [
  { id: 'budget_1', label: 'Rs 3,000 - 5,000', min: 3000, max: 5000 },
  { id: 'budget_2', label: 'Rs 5,000 - 10,000', min: 5000, max: 10000 },
  { id: 'budget_3', label: 'Rs 10,000 - 15,000', min: 10000, max: 15000 },
  { id: 'budget_4', label: 'Rs 15,000 - 20,000', min: 15000, max: 20000 },
  { id: 'budget_5', label: 'Rs 20,000 - 30,000', min: 20000, max: 30000 },
  { id: 'budget_6', label: 'Rs 30,000 - 50,000', min: 30000, max: 50000 }
]
const CREDIT_PACKAGES = [
  { credits: 1, price: 150, label: 'Single Credit' },
  { credits: 5, price: 590, label: '5 Credits', popular: true },
  { credits: 10, price: 950, label: '10 Credits' }
]

const api = async (path, opts = {}) => {
  const res = await fetch(`/api/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  return res.json()
}

const AppContext = createContext({})
const useApp = () => useContext(AppContext)

export default function App() {
  const [screen, setScreen] = useState(SCREENS.DP_AUTH)
  const [prevScreen, setPrevScreen] = useState(null)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [designs, setDesigns] = useState([])
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [deliveryPersons, setDeliveryPersons] = useState([])
  const [selectedDesign, setSelectedDesign] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [slots, setSlots] = useState([])
  const [trackingData, setTrackingData] = useState(null)
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [uploadForm, setUploadForm] = useState({ room_type: 'Dining Room', occasion: 'birthday', description: '', budget: null })
  const [originalImage, setOriginalImage] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlotHour, setSelectedSlotHour] = useState(null)
  const [seeded, setSeeded] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  // ===== DECORATOR/DELIVERY PERSON STATE =====
  const [dpUser, setDpUser] = useState(null)
  const [dpDashboard, setDpDashboard] = useState(null)
  const [dpOrders, setDpOrders] = useState([])
  const [dpSelectedOrder, setDpSelectedOrder] = useState(null)
  const [dpEarnings, setDpEarnings] = useState(null)
  const [dpCalendarData, setDpCalendarData] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().toISOString().slice(0, 7))
  const [dpAuthForm, setDpAuthForm] = useState({ phone: '', password: '' })
  const [dpActiveTimer, setDpActiveTimer] = useState(null)
  const [dpTimerSeconds, setDpTimerSeconds] = useState(0)
  const [faceScanImage, setFaceScanImage] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const dpVideoRef = useRef(null)
  const dpTimerRef = useRef(null)
  const [appMode, setAppMode] = useState('decorator') // 'decorator'
  // ===== AI SCANNER STATE (top-level to persist) =====
  const [scanImage, setScanImage] = useState(null)
  const [scanName, setScanName] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanAnalysis, setScanAnalysis] = useState(null)
  const [adminTab, setAdminTab] = useState('smart')

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const navigate = useCallback((s) => {
    setPrevScreen(screen)
    setScreen(s)
  }, [screen])

  const goBack = useCallback(() => {
    if (prevScreen) setScreen(prevScreen)
    else setScreen(SCREENS.HOME)
  }, [prevScreen])

  useEffect(() => {
    if (!seeded) {
      api('seed', { method: 'POST' }).then(() => setSeeded(true)).catch(() => {})
    }
  }, [seeded])

  useEffect(() => {
    if (user) {
      api(`designs?user_id=${user.id}`).then(d => !d.error && setDesigns(d))
      api(`orders?user_id=${user.id}`).then(o => !o.error && setOrders(o))
      api('items').then(i => !i.error && setItems(i))
      if (user.role === 'admin') {
        api('delivery-persons').then(dp => !dp.error && setDeliveryPersons(dp))
      }
    }
  }, [user])

  useEffect(() => {
    if (screen === SCREENS.TRACKING && selectedOrder?.id) {
      const poll = setInterval(() => {
        api(`delivery/track/${selectedOrder.id}`).then(d => {
          if (!d.error) setTrackingData(d)
          else if (d.status === 404) clearInterval(poll) // stop polling if order not found
        })
      }, 5000)
      api(`delivery/track/${selectedOrder.id}`).then(d => { if (!d.error) setTrackingData(d) })
      return () => clearInterval(poll)
    }
  }, [screen, selectedOrder])

  useEffect(() => {
    if (user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        api('user/location', { method: 'POST', body: { user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude } })
      }, () => {}, { enableHighAccuracy: true })
    }
  }, [user])

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      // Google OAuth via Google Identity Services (GSI)
      if (!window.google) {
        showToast('Google Sign-In not loaded. Please refresh.', 'error')
        setLoading(false); return
      }
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-placeholder.apps.googleusercontent.com',
        callback: async (response) => {
          // Decode JWT token from Google
          const base64Url = response.credential.split('.')[1]
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(window.atob(base64))
          const data = await api('auth/google', {
            method: 'POST',
            body: { google_id: payload.sub, email: payload.email, name: payload.name, photo_url: payload.picture }
          })
          if (data.error) { showToast(data.error, 'error'); return }
          setUser(data)
          showToast(`Welcome, ${data.name}!`, 'success')
          navigate(SCREENS.HOME)
        }
      })
      window.google.accounts.id.prompt()
    } catch (e) { showToast('Google Sign-In failed', 'error') }
    finally { setLoading(false) }
  }

  const handleAuth = async () => {
    setLoading(true)
    try {
      const endpoint = authMode === 'login' ? 'auth/login' : 'auth/register'
      const body = authMode === 'login' ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, phone: authForm.phone, password: authForm.password }
      const data = await api(endpoint, { method: 'POST', body })
      if (data.error) { showToast(data.error, 'error'); return }
      setUser(data)
      showToast(`Welcome${authMode === 'login' ? ' back' : ''}, ${data.name}!`, 'success')
      navigate(SCREENS.HOME)
    } catch (e) { showToast('Something went wrong', 'error') }
    finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    if (!originalImage) { showToast('Please upload or take a photo of your space first!', 'error'); return }
    if (!uploadForm.budget) { showToast('Please select a budget bracket', 'error'); return }
    const budget = BUDGET_BRACKETS.find(b => b.id === uploadForm.budget)
    if (!budget) { showToast('Please select a budget', 'error'); return }
    // Budget is the decoration budget the customer wants — no restrictions
    if (user.credits <= 0) { showToast('No credits! Please purchase credits.', 'error'); navigate(SCREENS.CREDITS); return }
    navigate(SCREENS.GENERATING)
    try {
      const data = await api('designs/generate', {
        method: 'POST',
        body: { user_id: user.id, room_type: uploadForm.room_type, occasion: uploadForm.occasion, description: uploadForm.description, original_image: originalImage, budget_min: budget.min, budget_max: budget.max }
      })
      if (data.error) { showToast(data.error, 'error'); navigate(SCREENS.UPLOAD); return }
      setSelectedDesign(data)
      setUser(prev => ({ ...prev, credits: data.remaining_credits }))
      setDesigns(prev => [data, ...prev])
      navigate(SCREENS.DESIGN)
      showToast('Your space has been decorated!', 'success')
    } catch (e) { showToast('Generation failed. Try again.', 'error'); navigate(SCREENS.UPLOAD) }
  }

  const handleCreateOrder = async () => {
    if (!selectedDesign) return
    setLoading(true)
    try {
      let lat = null, lng = null, detectedCity = null
      try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }))
        lat = pos.coords.latitude; lng = pos.coords.longitude
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          const geoData = await geoRes.json()
          detectedCity = geoData?.address?.city || geoData?.address?.town || geoData?.address?.county || null
        } catch (e) {}
      } catch (e) {}
      if (detectedCity) {
        const cityCheck = await api('city-check', { method: 'POST', body: { city: detectedCity } })
        if (!cityCheck.allowed) {
          showToast('Sorry! We currently serve only: ' + (cityCheck.active_cities?.join(', ') || 'selected cities') + '. You appear to be in ' + detectedCity + '.', 'error')
          setLoading(false); return
        }
      } else {
        const citiesData = await api('cities')
        const cityNames = (citiesData || []).map(c => c.name)
        const userCity = window.prompt('Please enter your city to proceed.\nAvailable cities: ' + cityNames.join(', '))
        if (!userCity) { showToast('City required to place order.', 'error'); setLoading(false); return }
        const cityCheck = await api('city-check', { method: 'POST', body: { city: userCity.trim() } })
        if (!cityCheck.allowed) {
          showToast('Sorry! We currently only serve: ' + (cityCheck.active_cities?.join(', ') || 'selected cities'), 'error')
          setLoading(false); return
        }
        detectedCity = userCity.trim()
      }
      const data = await api('orders', {
        method: 'POST',
        body: { user_id: user.id, design_id: selectedDesign.id, delivery_address: detectedCity || '', delivery_lat: lat, delivery_lng: lng }
      })
      if (data.error) { showToast(data.error, 'error'); return }
      setSelectedOrder(data)
      setOrders(prev => [data, ...prev])
      showToast('Order created! Now make payment & book delivery.', 'success')
      navigate(SCREENS.BOOKING)
    } catch (e) { showToast('Failed to create order', 'error') }
    finally { setLoading(false) }
  }

  const handlePayment = async (type, amount, orderId = null, creditsCount = 0) => {
    setLoading(true)
    try {
      const orderData = await api('payments/create-order', {
        method: 'POST',
        body: { type, amount, user_id: user.id, order_id: orderId, credits_count: creditsCount }
      })
      if (orderData.error) { showToast(orderData.error, 'error'); setLoading(false); return }
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, currency: 'INR',
        name: 'FatafatDecor', description: type === 'credits' ? `${creditsCount} AI Credits` : 'Decoration Delivery',
        order_id: orderData.razorpay_order_id,
        handler: async (response) => {
          const verify = await api('payments/verify', { method: 'POST', body: { ...response, payment_id: orderData.payment_id } })
          if (verify.success) {
            showToast('Payment successful!', 'success')
            if (type === 'credits') { setUser(prev => ({ ...prev, credits: (prev.credits || 0) + creditsCount })); navigate(SCREENS.HOME) }
            if (type === 'delivery' && orderId) { setSelectedOrder(prev => ({ ...prev, payment_status: 'partial', payment_amount: amount })) }
          } else { showToast('Payment verification failed', 'error') }
        },
        prefill: { name: user.name, email: user.email, contact: user.phone },
        theme: { color: '#EC4899' }
      }
      if (window.Razorpay) { new window.Razorpay(options).open() }
      else { showToast('Payment gateway loading...', 'error') }
    } catch (e) { showToast('Payment failed', 'error') }
    finally { setLoading(false) }
  }

  const handleBookSlot = async () => {
    if (!selectedOrder || !selectedDate || selectedSlotHour === null) { showToast('Please select date and time', 'error'); return }
    setLoading(true)
    try {
      const data = await api('delivery/book', { method: 'POST', body: { order_id: selectedOrder.id, date: selectedDate, hour: selectedSlotHour } })
      if (data.error) { showToast(data.error, 'error'); return }
      setSelectedOrder(prev => ({ ...prev, delivery_person_id: data.delivery_person.id, delivery_slot: data.slot, delivery_status: 'assigned' }))
      showToast(`Booked! ${data.delivery_person.name} will deliver at ${data.slot.time_label}`, 'success')
    } catch (e) { showToast('Booking failed', 'error') }
    finally { setLoading(false) }
  }

  const loadSlots = async (date) => {
    setSelectedDate(date)
    setSelectedSlotHour(null)
    const data = await api(`delivery/slots?date=${date}`)
    if (!data.error) setSlots(data.slots || [])
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setOriginalImage(ev.target?.result)
      reader.readAsDataURL(file)
    }
  }

  // ==================== SCREENS ====================


  // ===== DECORATOR APP - DATA LOADING =====
  useEffect(() => {
    if (dpUser) {
      api(`dp/dashboard/${dpUser.id}`).then(d => { if (!d.error) setDpDashboard(d) })
      api(`dp/orders/${dpUser.id}`).then(d => { if (!d.error) setDpOrders(d) })
      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
      // Auto update GPS
      if (navigator.geolocation) {
        const gpsInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(pos => {
            api('delivery/update-location', { method: 'POST', body: { delivery_person_id: dpUser.id, lat: pos.coords.latitude, lng: pos.coords.longitude } })
          }, () => {}, { enableHighAccuracy: true })
        }, 10000)
        navigator.geolocation.getCurrentPosition(pos => {
          api('delivery/update-location', { method: 'POST', body: { delivery_person_id: dpUser.id, lat: pos.coords.latitude, lng: pos.coords.longitude } })
        })
        return () => clearInterval(gpsInterval)
      }
    }
  }, [dpUser?.id])

  // Fetch calendar data when month or user changes (must be top-level to avoid infinite re-render)
  useEffect(() => {
    if (dpUser?.id) {
      api(`dp/calendar/${dpUser.id}?month=${calMonth}`).then(d => { if (!d.error) setDpCalendarData(d) })
    }
  }, [calMonth, dpUser?.id])

  // Timer countdown
  useEffect(() => {
    if (dpActiveTimer) {
      dpTimerRef.current = setInterval(() => {
        setDpTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(dpTimerRef.current)
            // ALARM - slot time over
            try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hZmpvaXB0eH18fX17eXd2dXV2eHp9f4GDhYaIiImIh4WDgX57eHVycW9ub3BydHd6fYCDhomLjI2NjIuJh4WCf3x5dnNxb25ubm9xc3Z5fICDhomMjY+Pj46MioeEgX57eHVycG9ubm5vcXN2eXyAg4aJjI2Pj4+OjIqHhIF+e3h1cnBvbm5ub3Fzdn').play() } catch(e) {}
            showToast('Time is up! Your booked slot has ended.', 'error')
            setDpActiveTimer(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(dpTimerRef.current)
    }
  }, [dpActiveTimer])

  const handleDpLogin = async () => {
    setLoading(true)
    try {
      const data = await api('dp/login', { method: 'POST', body: dpAuthForm })
      if (data.error) { showToast(data.error, 'error'); return }
      setDpUser(data)
      showToast(`Welcome, ${data.name}!`, 'success')
      navigate(SCREENS.DP_HOME)
    } catch (e) { showToast('Login failed', 'error') }
    finally { setLoading(false) }
  }

  const startFaceScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (dpVideoRef.current) {
        dpVideoRef.current.srcObject = stream
        dpVideoRef.current.play()
      }
    } catch (e) { showToast('Camera access denied', 'error') }
  }

  const captureFace = () => {
    if (!dpVideoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 240
    canvas.getContext('2d').drawImage(dpVideoRef.current, 0, 0, 320, 240)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setFaceScanImage(dataUrl)
    const stream = dpVideoRef.current.srcObject
    if (stream) stream.getTracks().forEach(t => t.stop())
  }

  const submitFaceScan = async (orderId) => {
    if (!faceScanImage) { showToast('Please capture your face first', 'error'); return }
    setLoading(true)
    try {
      const data = await api('dp/face-scan', { method: 'POST', body: { order_id: orderId, dp_id: dpUser.id, face_image: faceScanImage } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Face verified! Now enter customer OTP.', 'success')
    } catch (e) { showToast('Face scan failed', 'error') }
    finally { setLoading(false) }
  }

  const verifyOtp = async (orderId) => {
    if (!otpInput || otpInput.length !== 4) { showToast('Enter 4-digit OTP', 'error'); return }
    setLoading(true)
    try {
      const data = await api('dp/verify-otp', { method: 'POST', body: { order_id: orderId, otp: otpInput } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('OTP Verified! Decoration started.', 'success')
      // Start 1-hour timer (3600 seconds)
      setDpTimerSeconds(3600)
      setDpActiveTimer(orderId)
      setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'decorating' }))
      navigate(SCREENS.DP_ACTIVE_JOB)
    } catch (e) { showToast('OTP verification failed', 'error') }
    finally { setLoading(false) }
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ===== DECORATOR SCREENS =====
  const ctxValue = {screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer}
  return (
    <AppContext.Provider value={ctxValue}>
    <div className="min-h-screen bg-white max-w-md mx-auto relative overflow-hidden">
      <Toast />
      {/* User App Screens */}
      {screen === SCREENS.AUTH && <AuthScreen />}
      {screen === SCREENS.HOME && <HomeScreen />}
      {screen === SCREENS.UPLOAD && <UploadScreen />}
      {screen === SCREENS.GENERATING && <GeneratingScreen />}
      {screen === SCREENS.DESIGN && <DesignScreen />}
      {screen === SCREENS.BOOKING && <BookingScreen />}
      {screen === SCREENS.TRACKING && <TrackingScreen />}
      {screen === SCREENS.CREDITS && <CreditsScreen />}
      {screen === SCREENS.ORDERS && <OrdersScreen />}
      {screen === SCREENS.ORDER_DETAIL && <OrderDetailScreen />}
      {screen === SCREENS.PROFILE && <ProfileScreen />}
      {screen === SCREENS.ADMIN && <AdminScreen />}
      {/* Decorator App Screens */}
      {screen === SCREENS.DP_AUTH && <DpAuthScreen />}
      {screen === SCREENS.DP_HOME && <DpHomeScreen />}
      {screen === SCREENS.DP_ORDER && <DpOrderScreen />}
      {screen === SCREENS.DP_VERIFY && <DpVerifyScreen />}
      {screen === SCREENS.DP_ACTIVE_JOB && <DpActiveJobScreen />}
      {screen === SCREENS.DP_CALENDAR && <DpCalendarScreen />}
      {screen === SCREENS.DP_EARNINGS && <DpEarningsScreen />}
      {screen === SCREENS.DP_PROFILE && <DpProfileScreen />}
      {/* Navigation */}
      {user && !screen.startsWith('dp') && screen !== SCREENS.AUTH && screen !== SCREENS.GENERATING && <BottomNav />}
      {dpUser && screen.startsWith('dp') && screen !== SCREENS.DP_AUTH && screen !== SCREENS.DP_VERIFY && screen !== SCREENS.DP_ACTIVE_JOB && <DpBottomNav />}
    </div>
  )
    </AppContext.Provider>
  )
}


const AuthScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 fade-in">
    <div className="mb-8 text-center">
      <div className="w-20 h-20 gradient-pink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-pink">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold text-gradient-pink mb-1">FatafatDecor</h1>
      <p className="text-gray-400 text-sm">Instant Decoration at Your Doorstep</p>
    </div>
    <Card className="w-full max-w-sm border border-gray-100 shadow-lg shadow-pink-100/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-2 mb-4">
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setAuthMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${authMode === m ? 'gradient-pink text-white shadow-pink' : 'bg-gray-50 text-gray-400'}`}>
              {m === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>
        {authMode === 'register' && (
          <>
            <Input placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
              className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
            <Input placeholder="Phone Number" value={authForm.phone} onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
          </>
        )}
        <Input placeholder="Email" type="email" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
          className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
        <Input placeholder="Password" type="password" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
          className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
        <Button onClick={handleAuth} disabled={loading} className="w-full h-12 gradient-pink border-0 text-white font-bold text-base rounded-xl shadow-pink">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : authMode === 'login' ? 'Login' : 'Create Account'}
        </Button>
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <button onClick={handleGoogleAuth} disabled={loading}
          className="w-full h-12 flex items-center justify-center gap-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Demo: admin@fatafatdecor.com / admin123</p>
        <button onClick={() => { setAppMode('decorator'); navigate(SCREENS.DP_AUTH) }} className="w-full text-center text-sm text-pink-400 mt-1 pt-2 border-t border-gray-100">
          I'm a Decorator / Delivery Partner
        </button>
      </CardContent>
    </Card>
  </div>
)
}

const HomeScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="gradient-pink p-6 pb-10 rounded-b-3xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-white/70 text-xs">Welcome back</p>
          <h1 className="text-white text-xl font-bold">{user?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-200" />
            <span className="text-white font-bold text-sm">{user?.credits || 0}</span>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => navigate(SCREENS.ADMIN)} className="bg-white/20 rounded-full p-2">
              <Settings className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>

    <div className="px-4 -mt-6">
      <Card className="border-0 shadow-lg shadow-pink-100/50 cursor-pointer hover:scale-[1.02] transition-transform bg-white" onClick={() => navigate(SCREENS.UPLOAD)}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 gradient-pink rounded-2xl flex items-center justify-center shrink-0 shadow-pink">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">Decorate Your Space</h3>
            <p className="text-gray-400 text-xs mt-0.5">Take a photo & let AI create magic</p>
          </div>
          <ArrowRight className="w-5 h-5 text-pink-400" />
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-3 gap-3 px-4 mt-4">
      {[
        { label: 'Credits', value: user?.credits || 0, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
        { label: 'Designs', value: designs.length, icon: Image, color: 'text-pink-500', bg: 'bg-pink-50' },
        { label: 'Orders', value: orders.length, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' }
      ].map((s, i) => (
        <Card key={i} className="border border-gray-100 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mx-auto mb-1`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-lg font-bold text-gray-800">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    {designs.length > 0 && (
      <div className="px-4 mt-6">
        <h2 className="font-bold text-base text-gray-800 mb-3">Recent Designs</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {designs.slice(0, 5).map(d => (
            <Card key={d.id} className="border border-gray-100 shadow-sm shrink-0 w-44 cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => { setSelectedDesign(d); navigate(SCREENS.DESIGN) }}>
              <CardContent className="p-0">
                {d.decorated_image ? (
                  <img src={`data:image/png;base64,${d.decorated_image}`} alt="Design" className="w-full h-28 object-cover rounded-t-xl" />
                ) : (
                  <div className="w-full h-28 bg-pink-50 rounded-t-xl flex items-center justify-center"><Image className="w-8 h-8 text-pink-300" /></div>
                )}
                <div className="p-2">
                  <p className="text-xs font-semibold capitalize text-gray-700">{d.occasion}</p>
                  <p className="text-[10px] text-gray-400">{d.room_type}</p>
                  <div className="flex items-center mt-1">
                    <IndianRupee className="w-3 h-3 text-pink-500" />
                    <span className="text-xs font-bold text-pink-500">{d.total_cost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )}

    <div className="px-4 mt-6">
      <h2 className="font-bold text-base text-gray-800 mb-3">How It Works</h2>
      <div className="space-y-3">
        {[
          { step: 1, title: 'Capture Your Space', desc: 'Take a photo of the room to decorate', icon: Camera },
          { step: 2, title: 'AI Decorates It', desc: 'AI adds decorations to YOUR actual space', icon: Sparkles },
          { step: 3, title: 'Fatafat Delivery', desc: 'We deliver all items to your doorstep', icon: Truck }
        ].map(s => (
          <div key={s.step} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-pink flex items-center justify-center shrink-0 shadow-pink">
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">{s.title}</p>
              <p className="text-xs text-gray-400">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)
}

const UploadScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const selectedBudget = BUDGET_BRACKETS.find(b => b.id === uploadForm.budget)
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="flex items-center gap-3 p-4">
      <button onClick={goBack} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <h1 className="font-bold text-lg text-gray-800">Create Decoration</h1>
    </div>
    <div className="px-4 space-y-4">
      {/* Budget Selection - FIRST */}
      <Card className="border-2 border-pink-200 bg-pink-50/20">
        <CardContent className="p-4">
          <label className="text-sm font-semibold mb-2 block text-gray-700">
            <IndianRupee className="w-4 h-4 inline mr-1 text-pink-500" /> Select Budget <span className="text-pink-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_BRACKETS.map(b => {
              return (
                <button key={b.id} onClick={() => setUploadForm(p => ({ ...p, budget: b.id }))}
                  className={`py-2.5 px-3 rounded-xl text-left transition-all relative ${
                    uploadForm.budget === b.id ? 'gradient-pink text-white shadow-pink' :
                    'bg-gray-50 text-gray-600 border border-gray-200 hover:border-pink-300'
                  }`}>
                  <p className="text-xs font-bold">{b.label}</p>
                  {b.min <= 3000 && <span className="text-[9px] opacity-70">Starter</span>}
                </button>
              )
            })}
          </div>

        </CardContent>
      </Card>

      {/* Room Photo */}
      <Card className="border border-pink-100 bg-pink-50/30">
        <CardContent className="p-4">
          <label className="text-sm font-semibold mb-2 block text-gray-700">
            <Camera className="w-4 h-4 inline mr-1 text-pink-500" /> Room Photo <span className="text-pink-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">AI will decorate YOUR actual space</p>
          <div className="relative">
            {originalImage ? (
              <div className="relative">
                <img src={originalImage} alt="Room" className="w-full h-48 object-cover rounded-xl border border-pink-100" />
                <button onClick={() => setOriginalImage(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:border-pink-400 transition-colors bg-white">
                <Camera className="w-8 h-8 text-pink-300 mb-2" />
                <p className="text-sm text-pink-400 font-medium">Tap to capture or upload</p>
                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Room Type */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <label className="text-sm font-semibold mb-2 block text-gray-700">Room Type</label>
          <select value={uploadForm.room_type} onChange={e => setUploadForm(p => ({ ...p, room_type: e.target.value }))}
            className="w-full h-12 bg-gray-50 rounded-xl px-4 text-gray-700 border border-gray-200 outline-none focus:border-pink-400">
            {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* Occasion */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <label className="text-sm font-semibold mb-2 block text-gray-700">Occasion</label>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => setUploadForm(p => ({ ...p, occasion: o }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${uploadForm.occasion === o ? 'gradient-pink text-white shadow-pink' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                {o.replace('_', ' ')}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <label className="text-sm font-semibold mb-2 block text-gray-700">Special Requests (Optional)</label>
          <textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
            placeholder="E.g., Pastel theme with balloon arch, neon signs..."
            className="w-full h-20 bg-gray-50 rounded-xl p-3 text-gray-700 border border-gray-200 outline-none resize-none text-sm placeholder:text-gray-300 focus:border-pink-400" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        <span>Uses 1 credit. You have <strong className="text-gray-700">{user?.credits || 0}</strong> credits.</span>
      </div>

      <Button onClick={handleGenerate} disabled={!originalImage || !uploadForm.budget || user?.credits <= 0}
        className="w-full h-14 gradient-pink border-0 text-white font-bold text-base rounded-2xl shadow-pink disabled:opacity-40">
        <Sparkles className="w-5 h-5 mr-2" /> Decorate My Space {selectedBudget ? `(${selectedBudget.label})` : ''}
      </Button>
    </div>
  </div>
  )
}

const GeneratingScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
    <div className="relative mb-8">
      <div className="w-24 h-24 gradient-pink rounded-3xl flex items-center justify-center pulse-glow-pink">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      <div className="absolute -inset-4 border-2 border-pink-200 rounded-[2rem] animate-ping" />
    </div>
    <h2 className="text-xl font-bold text-gray-800 mb-2">Decorating Your Space</h2>
    <p className="text-gray-400 text-sm text-center mb-4">AI is adding decorations to your {uploadForm.room_type}...</p>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
      <span>This may take up to 60 seconds</span>
    </div>
    <div className="mt-8 w-48 h-1.5 bg-pink-100 rounded-full overflow-hidden">
      <div className="h-full gradient-pink rounded-full shimmer" style={{ width: '60%' }} />
    </div>
  </div>
)
}

const DesignScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  if (!selectedDesign) return null
  const d = selectedDesign
  const kitItems = (d.kit_items || []).length > 0 ? d.kit_items : (d.items_used || []).filter(i => i.is_kit_item)
  const addonItems = (d.addon_items || []).length > 0 ? d.addon_items : (d.items_used || []).filter(i => !i.is_kit_item)
  const hasKit = d.kit_name || kitItems.length > 0
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-800">Design Preview</h1>
        <Badge className="ml-auto capitalize gradient-pink border-0 text-white">{d.occasion}</Badge>
      </div>
      <div className="px-4 space-y-4">
        {d.decorated_image && (
          <div className="rounded-2xl overflow-hidden border border-pink-100 shadow-lg shadow-pink-100/30">
            <img src={`data:image/png;base64,${d.decorated_image}`} alt="Decorated" className="w-full" />
          </div>
        )}

        {/* Kit / Final Look */}
        {hasKit && (
          <Card className="border-2 border-pink-200 bg-pink-50/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h3 className="font-bold text-sm text-pink-600">Final Look Kit</h3>
              </div>
              {d.kit_name && <p className="text-sm font-bold text-gray-700 mb-1">{d.kit_name}</p>}
              <div className="space-y-1">
                {kitItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span className="text-xs text-gray-600 flex-1">{item.quantity}x {item.name} {item.color ? `(${item.color})` : ''}</span>
                    <span className="text-xs font-semibold text-pink-500">Rs {((item.price || 0) * (item.quantity || 1)).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-pink-100">
                <span className="text-xs font-bold text-gray-600">Kit Cost</span>
                <span className="text-sm font-bold text-pink-500">Rs {d.kit_cost || kitItems.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add-on Items */}
        {addonItems.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2">
              <Plus className="w-4 h-4 inline text-purple-500 mr-1" />
              Add-on Items
            </h3>
            <div className="space-y-2">
              {addonItems.map((item, i) => (
                <Card key={i} className="border border-gray-100">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.color} {item.category ? `• ${item.category.replace('_', ' ')}` : ''} • Qty: {item.quantity || 1}</p>
                    </div>
                    <p className="text-sm font-bold text-purple-500 shrink-0">Rs {((item.price || item.selling_price_unit || 0) * (item.quantity || 1)).toFixed(0)}</p>
                  </CardContent>
                </Card>
              ))}
              {addonItems.length > 0 && (
                <div className="flex justify-between px-1">
                  <span className="text-xs text-gray-400">Add-ons Total</span>
                  <span className="text-xs font-bold text-purple-500">Rs {d.addon_cost || addonItems.reduce((s, i) => s + (i.price || i.selling_price_unit || 0) * (i.quantity || 1), 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total Cost */}
        <Card className="border border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-700">Total Cost</h3>
                <p className="text-xs text-gray-400">{hasKit ? 'Kit + Add-ons' : 'All items'} included</p>
              </div>
              <div className="flex items-center text-green-600">
                <IndianRupee className="w-5 h-5" />
                <span className="text-2xl font-bold">{d.total_cost}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {d.status === 'generated' && (
            <>
              <Button onClick={handleCreateOrder} disabled={loading}
                className="w-full h-14 gradient-pink border-0 text-white font-bold text-base rounded-2xl shadow-pink">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingBag className="w-5 h-5 mr-2" /> Order & Book Delivery</>}
              </Button>
              <Button onClick={() => navigate(SCREENS.UPLOAD)} variant="outline"
                className="w-full h-12 border-pink-200 text-pink-500 font-semibold rounded-2xl hover:bg-pink-50">
                <RefreshCw className="w-4 h-4 mr-2" /> Regenerate Design
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const BookingScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const today = new Date()
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })
  const partialAmount = Math.round((selectedOrder?.total_cost || 0) * 0.5)
  const isPaid = selectedOrder?.payment_status === 'partial' || selectedOrder?.payment_status === 'full'
  const isBooked = selectedOrder?.delivery_status === 'assigned'
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={goBack} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Book Delivery</h1>
      </div>
      <div className="px-4 space-y-4">
        <Card className={`border ${isPaid ? 'border-green-200 bg-green-50/30' : 'border-pink-100'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPaid ? 'bg-green-500' : 'gradient-pink'} text-white`}>
                {isPaid ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <h3 className="font-bold text-sm text-gray-700">Advance Payment (50%)</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Pay Rs {partialAmount} now, remaining on delivery.</p>
            {!isPaid ? (
              <Button onClick={() => handlePayment('delivery', partialAmount, selectedOrder?.id)}
                disabled={loading} className="w-full h-11 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-2" /> Pay Rs {partialAmount}</>}
              </Button>
            ) : (
              <Badge className="bg-green-100 text-green-600 border-green-200">Payment Done</Badge>
            )}
          </CardContent>
        </Card>
        <Card className={`border border-gray-100 ${!isPaid ? 'opacity-40 pointer-events-none' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isBooked ? 'bg-green-500' : 'gradient-pink'} text-white`}>
                {isBooked ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <h3 className="font-bold text-sm text-gray-700">Select Date</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map(d => {
                const dt = new Date(d)
                return (
                  <button key={d} onClick={() => loadSlots(d)}
                    className={`shrink-0 w-16 py-2 rounded-xl text-center transition-all ${selectedDate === d ? 'gradient-pink text-white shadow-pink' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-[10px] uppercase">{dt.toLocaleDateString('en', { weekday: 'short' })}</p>
                    <p className="text-lg font-bold">{dt.getDate()}</p>
                    <p className="text-[10px]">{dt.toLocaleDateString('en', { month: 'short' })}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
        {selectedDate && isPaid && (
          <Card className="border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center text-xs font-bold text-white">3</div>
                <h3 className="font-bold text-sm text-gray-700">Select Time</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s => (
                  <button key={s.hour} onClick={() => s.available && setSelectedSlotHour(s.hour)} disabled={!s.available}
                    className={`py-2 px-1 rounded-xl text-center transition-all ${selectedSlotHour === s.hour ? 'gradient-pink text-white shadow-pink' : s.available ? 'bg-gray-50 border border-gray-200 hover:border-pink-300' : 'bg-red-50 opacity-40 border border-red-100'}`}>
                    <Clock className="w-3 h-3 mx-auto mb-0.5" />
                    <p className="text-[10px] font-semibold">{s.time_label}</p>
                    <p className={`text-[8px] ${s.available ? 'text-green-500' : 'text-red-400'}`}>{s.available ? `${s.available_count} free` : 'Full'}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {isPaid && selectedSlotHour !== null && !isBooked && (
          <Button onClick={handleBookSlot} disabled={loading} className="w-full h-14 gradient-pink border-0 text-white font-bold text-base rounded-2xl shadow-pink">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Truck className="w-5 h-5 mr-2" /> Confirm Delivery</>}
          </Button>
        )}
        {isBooked && (
          <Card className="border border-green-200 bg-green-50/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <h3 className="font-bold text-green-600">Delivery Booked!</h3>
              <p className="text-xs text-gray-400 mt-1">{selectedOrder.delivery_slot?.date} at {selectedOrder.delivery_slot?.hour}:00</p>
              <Button onClick={() => navigate(SCREENS.TRACKING)} className="mt-3 gradient-pink border-0 text-white shadow-pink">
                <Navigation className="w-4 h-4 mr-2" /> Track Delivery
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

const TrackingScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const trackableOrders = orders.filter(o => o.delivery_status === 'assigned' || o.delivery_status === 'in_transit')
  useEffect(() => {
    if (trackingData && mapRef.current && typeof window !== 'undefined' && window.L) {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
      const dloc = trackingData.delivery_location, uloc = trackingData.user_location
      const map = window.L.map(mapRef.current).setView([dloc?.lat || uloc?.lat || 28.6139, dloc?.lng || uloc?.lng || 77.2090], 14)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      if (dloc?.lat) window.L.marker([dloc.lat, dloc.lng]).addTo(map).bindPopup(`<b>${trackingData.delivery_person?.name}</b>`).openPopup()
      if (uloc?.lat) window.L.marker([uloc.lat, uloc.lng]).addTo(map).bindPopup('<b>You</b>')
      mapInstance.current = map
      return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
    }
  }, [trackingData])
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.ORDERS)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Live Tracking</h1>
      </div>
      <div className="px-4 space-y-4">
        {!selectedOrder && trackableOrders.length === 0 && (
          <div className="text-center py-12"><MapPin className="w-12 h-12 text-pink-200 mx-auto mb-3" /><p className="text-gray-400">No active deliveries</p></div>
        )}
        {!selectedOrder && trackableOrders.length > 0 && trackableOrders.map(o => (
          <Card key={o.id} className="border border-gray-100 cursor-pointer" onClick={() => setSelectedOrder(o)}>
            <CardContent className="p-3 flex items-center gap-3">
              <Truck className="w-5 h-5 text-pink-500" />
              <div><p className="text-sm font-semibold text-gray-700">Order #{o.id.slice(0, 8)}</p><p className="text-xs text-gray-400 capitalize">{o.delivery_status}</p></div>
              <ChevronRight className="w-4 h-4 ml-auto text-gray-300" />
            </CardContent>
          </Card>
        ))}
        {selectedOrder && trackingData && (
          <>
            <div ref={mapRef} style={{ width: '100%', height: '250px', borderRadius: '16px' }} className="bg-pink-50 border border-pink-100" />
            <Card className="border border-gray-100">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm text-gray-700 mb-3">Status</h3>
                <div className="space-y-3">
                  {[
                    { key: 'assigned', label: 'Decorator Assigned', icon: <CheckCircle2 className="w-4 h-4 text-white" /> },
                    { key: 'en_route', label: 'On the Way', icon: <Truck className="w-4 h-4 text-white" /> },
                    { key: 'arrived', label: 'Arrived at Your Place', icon: <MapPin className="w-4 h-4 text-white" /> },
                    { key: 'decorating', label: 'Decorating in Progress', icon: <Star className="w-4 h-4 text-white" /> },
                    { key: 'delivered', label: 'Decoration Complete 🎉', icon: <CheckCircle2 className="w-4 h-4 text-white" /> },
                  ].map(({ key, label, icon }, i) => {
                    const order = ['assigned','en_route','arrived','decorating','delivered']
                    const isActive = order.indexOf(trackingData.delivery_status) >= i
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'gradient-pink' : 'bg-gray-100'}`}>
                          {icon}
                        </div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-gray-700' : 'text-gray-300'}`}>{label}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            {trackingData.delivery_person && (
              <Card className="border border-gray-100">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-pink flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
                  <div><p className="font-bold text-sm text-gray-700">{trackingData.delivery_person.name}</p><p className="text-xs text-gray-400">Delivery Partner</p></div>
                  <a href={`tel:${trackingData.delivery_person.phone}`} className="ml-auto w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg"><Phone className="w-5 h-5 text-white" /></a>
                </CardContent>
              </Card>
            )}
            {trackingData.verification_otp && !trackingData.otp_verified && (
              <Card className="border-2 border-pink-300 bg-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full gradient-pink flex items-center justify-center">
                      <span className="text-white text-xs font-bold">🔐</span>
                    </div>
                    <h3 className="font-bold text-sm text-pink-700">Your Verification OTP</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Your decorator has arrived! Share this code with them to start the decoration.</p>
                  <div className="flex items-center justify-center gap-2 bg-white rounded-2xl py-4 border-2 border-pink-200">
                    {trackingData.verification_otp.split('').map((digit, i) => (
                      <div key={i} className="w-14 h-16 rounded-xl gradient-pink flex items-center justify-center shadow-pink">
                        <span className="text-white text-3xl font-black">{digit}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-center text-pink-400 mt-2 font-medium">Show this to your decorator — do not share with anyone else</p>
                </CardContent>
              </Card>
            )}
            {trackingData.otp_verified && (
              <Card className="border border-green-200 bg-green-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-bold text-sm text-green-700">Decoration in Progress!</p>
                    <p className="text-xs text-green-500">OTP verified — your decorator is at work 🎉</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const CreditsScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="flex items-center gap-3 p-4">
      <button onClick={() => navigate(SCREENS.HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
      <h1 className="font-bold text-lg text-gray-800">Buy Credits</h1>
    </div>
    <div className="px-4 space-y-4">
      <Card className="border border-pink-100 bg-pink-50/30">
        <CardContent className="p-6 text-center">
          <Zap className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-800">{user?.credits || 0}</p>
          <p className="text-sm text-gray-400">Current Credits</p>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {CREDIT_PACKAGES.map(pkg => (
          <Card key={pkg.credits} className={`border cursor-pointer hover:scale-[1.02] transition-transform ${pkg.popular ? 'border-pink-300 shadow-pink' : 'border-gray-100'}`}
            onClick={() => handlePayment('credits', pkg.price, null, pkg.credits)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl gradient-pink flex items-center justify-center shadow-pink"><Zap className="w-6 h-6 text-white" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-700">{pkg.label}</h3>
                  {pkg.popular && <Badge className="gradient-pink border-0 text-white text-[10px]">BEST</Badge>}
                </div>
                <p className="text-sm text-gray-400">{pkg.credits} AI Credits</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-pink-500 flex items-center"><IndianRupee className="w-4 h-4" />{pkg.price}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
)
}

const OrdersScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Orders</h1></div>
    <div className="px-4 space-y-3">
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-pink-200 mx-auto mb-3" />
          <p className="text-gray-400">No orders yet</p>
          <Button onClick={() => navigate(SCREENS.UPLOAD)} className="mt-3 gradient-pink border-0 text-white shadow-pink">Create Design</Button>
        </div>
      ) : orders.map(o => (
        <Card key={o.id} className="border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedOrder(o)
            if (o.delivery_status === 'assigned' || o.delivery_status === 'in_transit') navigate(SCREENS.TRACKING)
            else if (o.payment_status === 'pending') navigate(SCREENS.BOOKING)
            else navigate(SCREENS.ORDER_DETAIL)
          }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center"><Package className="w-5 h-5 text-pink-500" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-pink-500 flex items-center justify-end"><IndianRupee className="w-3 h-3" />{o.total_cost}</p>
                <Badge className={`text-[10px] ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : o.delivery_status === 'in_transit' ? 'bg-blue-100 text-blue-600' : o.delivery_status === 'assigned' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>{o.delivery_status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)
}

const OrderDetailScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  if (!selectedOrder) return null
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.ORDERS)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Order Details</h1>
      </div>
      <div className="px-4 space-y-4">
        <Card className="border border-gray-100">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Order ID</span><span className="text-sm font-mono text-gray-700">#{selectedOrder.id.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Total</span><span className="text-sm font-bold text-pink-500">Rs {selectedOrder.total_cost}</span></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Payment</span><Badge className={selectedOrder.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}>{selectedOrder.payment_status}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-400 text-sm">Delivery</span><Badge className="capitalize">{selectedOrder.delivery_status}</Badge></div>
          </CardContent>
        </Card>
        <div>
          <h3 className="font-bold text-sm text-gray-700 mb-2">Items</h3>
          {(selectedOrder.items || []).map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">{item.name} x{item.quantity}</span>
              <span className="text-sm font-semibold text-gray-700">Rs {((item.price || item.selling_price_unit || 0) * (item.quantity || 1)).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ProfileScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="p-4"><h1 className="font-bold text-lg text-gray-800">Profile</h1></div>
    <div className="px-4 space-y-4">
      <Card className="border border-pink-100 bg-pink-50/30">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-pink"><User className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">{user?.name}</h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
            {user?.phone && <p className="text-xs text-gray-400">{user?.phone}</p>}
            <Badge className="mt-1 capitalize gradient-pink border-0 text-white">{user?.role}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-100">
        <CardContent className="p-4 space-y-1">
          <button onClick={() => navigate(SCREENS.CREDITS)} className="w-full flex items-center gap-3 py-3 border-b border-gray-50">
            <Zap className="w-5 h-5 text-yellow-500" /><span className="flex-1 text-left text-sm text-gray-700">Credits: {user?.credits || 0}</span><ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={() => navigate(SCREENS.ORDERS)} className="w-full flex items-center gap-3 py-3 border-b border-gray-50">
            <ShoppingBag className="w-5 h-5 text-pink-500" /><span className="flex-1 text-left text-sm text-gray-700">My Orders</span><ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => navigate(SCREENS.ADMIN)} className="w-full flex items-center gap-3 py-3">
              <Settings className="w-5 h-5 text-purple-500" /><span className="flex-1 text-left text-sm text-gray-700">Admin Panel</span><ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          )}
        </CardContent>
      </Card>
      <Button onClick={() => { setUser(null); setScreen(SCREENS.AUTH); setDesigns([]); setOrders([]) }}
        variant="outline" className="w-full h-12 border-red-200 text-red-400 font-semibold rounded-2xl hover:bg-red-50">
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  </div>
)
}

// ===== SMART KIT CREATOR - uses top-level state =====
const SmartKitCreator = () => {
const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const [savedRefs, setSavedRefs] = useState([])
  useEffect(() => { api('kits/reference-images').then(d => { if (Array.isArray(d)) setSavedRefs(d) }) }, [])

  const handleScanUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => { setScanImage(ev.target?.result); setScanAnalysis(null) }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!scanImage) { showToast('Upload an image first', 'error'); return }
    setScanning(true); setScanAnalysis(null)
    try {
      const data = await api('kits/analyze', { method: 'POST', body: { image_base64: scanImage, name: scanName } })
      if (data.success) {
        setScanAnalysis(data)
        if (!scanName && data.decoration_type) setScanName(data.decoration_type)
        showToast('Analysis complete! Scroll down for full report.', 'success')
      } else { showToast('Analysis failed: ' + (data.error || 'Unknown'), 'error') }
    } catch (e) { showToast('Analysis failed', 'error') }
    finally { setScanning(false) }
  }

  const addItemsToStock = async () => {
    if (!scanAnalysis?.items) return
    const itemsToAdd = scanAnalysis.items.map(i => ({
      name: i.name, description: `Detected from: ${scanName || 'AI scan'}`,
      category: i.category || 'general', price: Number(i.estimated_unit_price) || 0,
      color: i.color || '', size: i.size || '',
      stock_count: Number(i.quantity) || 1,
      tags: [scanAnalysis.occasion_suggestion || 'universal'].filter(Boolean)
    }))
    const data = await api('items/bulk', { method: 'POST', body: { items: itemsToAdd } })
    if (!data.error) {
      showToast(`${data.count} items added to inventory!`, 'success')
      api('items').then(i => { if (!i.error) setItems(i) })
    } else { showToast(data.error, 'error') }
  }

  const saveAsKit = async () => {
    if (!scanAnalysis) return
    const kitName = scanName || scanAnalysis.decoration_type || `Kit ${new Date().toLocaleDateString()}`
    const data = await api('kits', {
      method: 'POST',
      body: {
        name: kitName, description: scanAnalysis.notes || scanAnalysis.decoration_type || '',
        occasion_tags: scanAnalysis.occasion_suggestion ? [scanAnalysis.occasion_suggestion] : [],
        room_types: scanAnalysis.room_suggestion ? [scanAnalysis.room_suggestion] : [],
        kit_items: (scanAnalysis.items || []).map(i => ({
          name: i.name, category: i.category, color: i.color,
          size: i.size, unit_price: Number(i.estimated_unit_price) || 0,
          quantity: Number(i.quantity) || 1
        })),
        labor_cost: Number(scanAnalysis.suggested_labor_cost) || 0,
        travel_cost: Number(scanAnalysis.suggested_travel_cost) || 500,
        decoration_charges: 0,
        final_price: Number(scanAnalysis.suggested_final_price) || 0,
        setup_time_minutes: Number(scanAnalysis.setup_time_minutes) || 60,
        color_theme: scanAnalysis.color_theme || '',
        difficulty: scanAnalysis.difficulty || 'medium',
        reference_images: scanImage ? [scanImage] : [],
        notes: scanAnalysis.notes || ''
      }
    })
    if (!data.error) {
      setKits(prev => [data, ...prev])
      showToast(`Kit "${kitName}" saved!`, 'success')
    } else { showToast(data.error, 'error') }
  }

  const saveRefImage = async () => {
    if (!scanImage || !scanName) { showToast('Name and image required', 'error'); return }
    const data = await api('kits/reference-images', {
      method: 'POST', body: { name: scanName, image_base64: scanImage, occasion: scanAnalysis?.occasion_suggestion || '', description: scanAnalysis?.decoration_type || '' }
    })
    if (!data.error) { setSavedRefs(prev => [{ ...data, has_image: true }, ...prev]); showToast('Reference saved!', 'success') }
  }

  const a = scanAnalysis
  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="border-2 border-pink-200 bg-pink-50/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h3 className="font-bold text-sm text-gray-700">AI Decoration Scanner</h3>
          </div>
          <p className="text-xs text-gray-400">Upload a photo. AI detects all items, counts units, estimates costs & generates a kit name.</p>
          <Input placeholder="Name (optional - AI will auto-name)" value={scanName} onChange={e => setScanName(e.target.value)} className="bg-white border-gray-200 h-10 rounded-lg" />
          {scanImage ? (
            <div className="relative">
              <img src={scanImage} alt="" className="w-full h-48 object-cover rounded-xl border border-pink-200" />
              <button onClick={() => { setScanImage(null); setScanAnalysis(null); setScanName('') }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"><Trash2 className="w-4 h-4 text-white" /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-pink-300 rounded-xl cursor-pointer hover:border-pink-500 bg-white">
              <Camera className="w-8 h-8 text-pink-300 mb-2" />
              <p className="text-sm text-pink-400 font-medium">Upload Decoration Photo</p>
              <input type="file" accept="image/*" onChange={handleScanUpload} className="hidden" />
            </label>
          )}
          <Button onClick={analyzeImage} disabled={!scanImage || scanning}
            className="w-full h-12 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing (10-20 sec)...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyze with AI</>}
          </Button>
        </CardContent>
      </Card>

      {/* ===== ANALYSIS REPORT ===== */}
      {a && a.success && (
        <>
          {/* Summary Card */}
          <Card className="border-2 border-green-300 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-green-700">Analysis Report</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2.5 border border-green-100 col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase">Kit Name (editable)</p>
                  <Input value={scanName || a.decoration_type} onChange={e => setScanName(e.target.value)}
                    className="bg-transparent border-0 h-7 p-0 text-sm font-bold text-gray-700 focus-visible:ring-0" />
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-100">
                  <p className="text-[10px] text-gray-400 uppercase">Color Theme</p>
                  <p className="text-sm font-semibold text-gray-700">{a.color_theme}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-100">
                  <p className="text-[10px] text-gray-400 uppercase">Best For</p>
                  <p className="text-sm font-semibold capitalize text-gray-700">{a.occasion_suggestion}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-100">
                  <p className="text-[10px] text-gray-400 uppercase">Setup Time</p>
                  <p className="text-sm font-semibold text-gray-700">{a.setup_time_minutes} minutes</p>
                </div>
              </div>
              {a.notes && <p className="text-xs text-gray-500 italic bg-white rounded-lg p-2 border border-green-100">{a.notes}</p>}
            </CardContent>
          </Card>

          {/* Itemized Report - EDITABLE */}
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-1">Detected Items ({(a.items || []).length})</h3>
              <p className="text-[10px] text-gray-400 mb-3">Edit names, quantities & prices below</p>
              <div className="space-y-2">
                {(a.items || []).map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="space-y-1.5">
                      <Input value={item.name} onChange={e => {
                        const updated = { ...a, items: [...a.items] }
                        updated.items[i] = { ...updated.items[i], name: e.target.value }
                        setScanAnalysis(updated)
                      }} className="bg-white border-gray-200 h-8 rounded text-xs font-bold" />
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-400">Color</label>
                          <Input value={item.color} onChange={e => {
                            const updated = { ...a, items: [...a.items] }
                            updated.items[i] = { ...updated.items[i], color: e.target.value }
                            setScanAnalysis(updated)
                          }} className="bg-white border-gray-200 h-7 rounded text-[11px]" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-400">Category</label>
                          <Input value={item.category} onChange={e => {
                            const updated = { ...a, items: [...a.items] }
                            updated.items[i] = { ...updated.items[i], category: e.target.value }
                            setScanAnalysis(updated)
                          }} className="bg-white border-gray-200 h-7 rounded text-[11px]" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-gray-400">Size</label>
                          <Input value={item.size} onChange={e => {
                            const updated = { ...a, items: [...a.items] }
                            updated.items[i] = { ...updated.items[i], size: e.target.value }
                            setScanAnalysis(updated)
                          }} className="bg-white border-gray-200 h-7 rounded text-[11px]" />
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-end">
                        <div className="w-20">
                          <label className="text-[9px] text-gray-400">Quantity</label>
                          <Input type="number" value={item.quantity} onChange={e => {
                            const updated = { ...a, items: [...a.items] }
                            updated.items[i] = { ...updated.items[i], quantity: Number(e.target.value) || 0 }
                            updated.total_items_cost = updated.items.reduce((s, it) => s + (it.estimated_unit_price * it.quantity), 0)
                            updated.suggested_final_price = updated.total_items_cost + (updated.suggested_labor_cost || 0) + (updated.suggested_travel_cost || 500)
                            setScanAnalysis(updated)
                          }} className="bg-white border-pink-200 h-8 rounded text-xs font-bold text-center" />
                        </div>
                        <div className="w-24">
                          <label className="text-[9px] text-gray-400">Rs per piece</label>
                          <Input type="number" value={item.estimated_unit_price} onChange={e => {
                            const updated = { ...a, items: [...a.items] }
                            updated.items[i] = { ...updated.items[i], estimated_unit_price: Number(e.target.value) || 0 }
                            updated.total_items_cost = updated.items.reduce((s, it) => s + (it.estimated_unit_price * it.quantity), 0)
                            updated.suggested_final_price = updated.total_items_cost + (updated.suggested_labor_cost || 0) + (updated.suggested_travel_cost || 500)
                            setScanAnalysis(updated)
                          }} className="bg-white border-pink-200 h-8 rounded text-xs font-bold text-center" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-bold text-green-600">= Rs {(item.estimated_unit_price || 0) * (item.quantity || 0)}</p>
                        </div>
                        <button onClick={() => {
                          const updated = { ...a, items: a.items.filter((_, idx) => idx !== i) }
                          updated.total_items_cost = updated.items.reduce((s, it) => s + (it.estimated_unit_price * it.quantity), 0)
                          updated.suggested_final_price = updated.total_items_cost + (updated.suggested_labor_cost || 0) + (updated.suggested_travel_cost || 500)
                          setScanAnalysis(updated)
                        }} className="w-7 h-7 rounded bg-red-50 flex items-center justify-center shrink-0">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add new item button */}
                <button onClick={() => {
                  const updated = { ...a, items: [...(a.items || []), { name: 'New Item', category: 'other', color: '', size: '', quantity: 1, estimated_unit_price: 0 }] }
                  setScanAnalysis(updated)
                }} className="w-full py-2 border-2 border-dashed border-pink-200 rounded-lg text-xs text-pink-400 font-semibold hover:border-pink-400 flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary - EDITABLE */}
          <Card className="border-2 border-pink-200 bg-pink-50/30">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Cost Summary (editable)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Items Cost</span>
                  <span className="font-semibold">Rs {a.total_items_cost}</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-gray-500">Labor Cost</span>
                  <Input type="number" value={a.suggested_labor_cost || 0} onChange={e => {
                    const labor = Number(e.target.value) || 0
                    setScanAnalysis(prev => ({ ...prev, suggested_labor_cost: labor, suggested_final_price: prev.total_items_cost + labor + (prev.suggested_travel_cost || 500) }))
                  }} className="w-24 h-7 bg-white border-pink-200 rounded text-xs text-right font-semibold" />
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-gray-500">Travel Cost</span>
                  <Input type="number" value={a.suggested_travel_cost || 500} onChange={e => {
                    const travel = Number(e.target.value) || 0
                    setScanAnalysis(prev => ({ ...prev, suggested_travel_cost: travel, suggested_final_price: prev.total_items_cost + (prev.suggested_labor_cost || 0) + travel }))
                  }} className="w-24 h-7 bg-white border-pink-200 rounded text-xs text-right font-semibold" />
                </div>
                <div className="flex justify-between items-center text-base pt-2 border-t border-pink-200">
                  <span className="font-bold text-gray-700">Final Price</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">Rs</span>
                    <Input type="number" value={a.suggested_final_price || 0} onChange={e => {
                      setScanAnalysis(prev => ({ ...prev, suggested_final_price: Number(e.target.value) || 0 }))
                    }} className="w-28 h-8 bg-white border-pink-300 rounded text-sm text-right font-bold text-pink-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={saveAsKit} className="w-full h-12 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
              <Plus className="w-4 h-4 mr-2" /> Save as Kit: "{scanName || a.decoration_type}"
            </Button>
            <Button onClick={addItemsToStock} variant="outline" className="w-full h-11 border-green-300 text-green-600 font-semibold rounded-xl hover:bg-green-50">
              <Package className="w-4 h-4 mr-2" /> Add All Items to Inventory Stock
            </Button>
            <Button onClick={saveRefImage} disabled={!scanName} variant="outline" className="w-full h-11 border-purple-300 text-purple-600 font-semibold rounded-xl hover:bg-purple-50">
              <Image className="w-4 h-4 mr-2" /> Save Reference Image
            </Button>
          </div>
        </>
      )}

      {/* Saved References */}
      {savedRefs.length > 0 && (
        <div>
          <h3 className="font-bold text-sm text-gray-700 mb-2">Saved References ({savedRefs.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {savedRefs.map(ref => (
              <div key={ref.id} className="relative">
                <div className="w-full aspect-square rounded-lg bg-pink-50 flex items-center justify-center border border-gray-200"><Image className="w-6 h-6 text-pink-300" /></div>
                <p className="text-[10px] text-gray-600 mt-1 truncate">{ref.name}</p>
                <button onClick={async () => {
                  await api(`kits/reference-images/${ref.id}`, { method: 'DELETE' })
                  setSavedRefs(p => p.filter(r => r.id !== ref.id))
                }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><Trash2 className="w-3 h-3 text-white" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const AdminScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const tab = adminTab
  const setTab = setAdminTab
  const [newItem, setNewItem] = useState({ name: '', description: '', category: 'balloon_arch', price: '', stock_count: '', tags: '', color: '', material: '', size: '' })
  const [newDp, setNewDp] = useState({ name: '', phone: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [kits, setKits] = useState([])
  const [selectedKit, setSelectedAdminKit] = useState(null)
  const [newKit, setNewKit] = useState({
    name: '', description: '', occasion_tags: '', room_types: '',
    labor_cost: '', final_price: '', setup_time_minutes: '60',
    color_theme: '', notes: '', difficulty: 'medium'
  })
  const [kitItems, setKitItems] = useState([])
  const [newKitItem, setNewKitItem] = useState({ name: '', description: '', category: '', color: '', size: '', unit_price: '', quantity: '1' })
  const [kitRefImages, setKitRefImages] = useState([])

  useEffect(() => { api('kits').then(d => { if (!d.error) setKits(d) }) }, [])

  const addKitRefImage = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setKitRefImages(prev => [...prev, ev.target?.result])
      reader.readAsDataURL(file)
    }
  }

  const addKitItem = () => {
    if (!newKitItem.name || !newKitItem.unit_price) { showToast('Item name and price required', 'error'); return }
    setKitItems(prev => [...prev, { ...newKitItem, unit_price: Number(newKitItem.unit_price), quantity: Number(newKitItem.quantity) || 1 }])
    setNewKitItem({ name: '', description: '', category: '', color: '', size: '', unit_price: '', quantity: '1' })
  }

  const saveKit = async () => {
    if (!newKit.name) { showToast('Kit name required', 'error'); return }
    const data = await api('kits', {
      method: 'POST',
      body: {
        ...newKit,
        occasion_tags: newKit.occasion_tags.split(',').map(t => t.trim()).filter(Boolean),
        room_types: newKit.room_types.split(',').map(t => t.trim()).filter(Boolean),
        labor_cost: Number(newKit.labor_cost) || 0,
        final_price: Number(newKit.final_price) || 0,
        setup_time_minutes: Number(newKit.setup_time_minutes) || 60,
        kit_items: kitItems,
        reference_images: kitRefImages
      }
    })
    if (!data.error) {
      setKits(prev => [data, ...prev])
      setNewKit({ name: '', description: '', occasion_tags: '', room_types: '', labor_cost: '', final_price: '', setup_time_minutes: '60', color_theme: '', notes: '', difficulty: 'medium' })
      setKitItems([]); setKitRefImages([])
      showToast('Decoration Kit saved!', 'success')
    }
  }

  const deleteKit = async (id) => {
    await api(`kits/${id}`, { method: 'DELETE' })
    setKits(prev => prev.filter(k => k.id !== id))
    showToast('Kit deleted', 'success')
  }

  const addItem = async () => {
    if (!newItem.name || !newItem.price) { showToast('Name and price required', 'error'); return }
    const data = await api('items', {
      method: 'POST',
      body: { ...newItem, price: Number(newItem.price), stock_count: Number(newItem.stock_count) || 0, tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean) }
    })
    if (!data.error) { setItems(prev => [...prev, data]); setNewItem({ name: '', description: '', category: 'balloon_arch', price: '', stock_count: '', tags: '', color: '', material: '', size: '' }); showToast('Item added!', 'success') }
  }

  const updateItem = async (id, updates) => {
    const data = await api(`items/${id}`, { method: 'PUT', body: updates })
    if (!data.error) { setItems(prev => prev.map(i => i.id === id ? data : i)); setEditingItem(null); showToast('Updated!', 'success') }
  }

  const deleteItem = async (id) => {
    await api(`items/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Deleted', 'success')
  }

  const addDeliveryPerson = async () => {
    if (!newDp.name) { showToast('Name required', 'error'); return }
    const data = await api('delivery-persons', { method: 'POST', body: newDp })
    if (!data.error) { setDeliveryPersons(prev => [...prev, data]); setNewDp({ name: '', phone: '' }); showToast('Added!', 'success') }
  }

  const categories = ['balloon_arch', 'balloon_wall', 'balloons', 'neon_signs', 'backdrop', 'props', 'lights', 'table_decor', 'banners', 'flowers', 'drapes', 'general']



  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.HOME)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Admin Panel</h1>
      </div>
      <div className="px-4">
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {['smart', 'kits', 'items', 'delivery'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${tab === t ? 'gradient-pink text-white shadow-pink' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
              {t === 'smart' ? 'AI Scanner' : t === 'kits' ? 'Kits' : t === 'items' ? 'Inventory' : 'Team'}
            </button>
          ))}
        </div>

        {/* AI Smart Kit Creator */}
        {tab === 'smart' && <SmartKitCreator />}

        {tab === 'kits' && (
          <div className="space-y-3">
            {/* Kit Builder Form */}
            <Card className="border border-pink-100">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm text-gray-700">Create Decoration Kit</h3>
                <Input placeholder="Kit Name (e.g., Birthday Pastel Balloon Setup)" value={newKit.name} onChange={e => setNewKit(p => ({ ...p, name: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <textarea placeholder="Description (what this kit looks like, style, theme...)" value={newKit.description} onChange={e => setNewKit(p => ({ ...p, description: e.target.value }))}
                  className="w-full h-16 bg-gray-50 rounded-lg p-3 text-sm border border-gray-200 outline-none resize-none" />

                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Occasions (birthday,wedding)" value={newKit.occasion_tags} onChange={e => setNewKit(p => ({ ...p, occasion_tags: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                  <Input placeholder="Rooms (Living Room,Hall)" value={newKit.room_types} onChange={e => setNewKit(p => ({ ...p, room_types: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Labor Rs" type="number" value={newKit.labor_cost} onChange={e => setNewKit(p => ({ ...p, labor_cost: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                  <Input placeholder="Travel Rs" type="number" value={newKit.travel_cost || ''} onChange={e => setNewKit(p => ({ ...p, travel_cost: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                  <Input placeholder="Final Price" type="number" value={newKit.final_price} onChange={e => setNewKit(p => ({ ...p, final_price: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Decor Chrg Rs" type="number" value={newKit.decoration_charges || ''} onChange={e => setNewKit(p => ({ ...p, decoration_charges: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                  <Input placeholder="Setup (min)" type="number" value={newKit.setup_time_minutes} onChange={e => setNewKit(p => ({ ...p, setup_time_minutes: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Color Theme" value={newKit.color_theme} onChange={e => setNewKit(p => ({ ...p, color_theme: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />
                  <select value={newKit.difficulty} onChange={e => setNewKit(p => ({ ...p, difficulty: e.target.value }))} className="h-10 bg-gray-50 rounded-lg px-3 text-xs border border-gray-200">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>

                {/* Reference Images */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Reference Photos (past work)</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {kitRefImages.map((img, i) => (
                      <div key={i} className="shrink-0 relative">
                        <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover border border-pink-200" />
                        <button onClick={() => setKitRefImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                    <label className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-pink-200 flex items-center justify-center cursor-pointer hover:border-pink-400">
                      <Plus className="w-5 h-5 text-pink-300" />
                      <input type="file" accept="image/*" onChange={addKitRefImage} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Kit Items */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Kit Items (add each item in this kit)</label>
                  {kitItems.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {kitItems.map((ki, i) => (
                        <div key={i} className="flex items-center gap-2 bg-pink-50 rounded-lg p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{ki.quantity}x {ki.name}</p>
                            <p className="text-[10px] text-gray-400">{ki.color} {ki.size ? `• ${ki.size}` : ''} • Rs {ki.unit_price}/pc</p>
                          </div>
                          <p className="text-xs font-bold text-pink-500 shrink-0">Rs {ki.unit_price * ki.quantity}</p>
                          <button onClick={() => setKitItems(p => p.filter((_, idx) => idx !== i))} className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-400" /></button>
                        </div>
                      ))}
                      <p className="text-xs font-bold text-pink-500 text-right">Items Total: Rs {kitItems.reduce((s, ki) => s + ki.unit_price * ki.quantity, 0)}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-2 space-y-1.5 border border-gray-200">
                    <Input placeholder="Item Name (e.g., Small Latex Balloon)" value={newKitItem.name} onChange={e => setNewKitItem(p => ({ ...p, name: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                    <div className="grid grid-cols-3 gap-1">
                      <Input placeholder="Color" value={newKitItem.color} onChange={e => setNewKitItem(p => ({ ...p, color: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                      <Input placeholder="Size" value={newKitItem.size} onChange={e => setNewKitItem(p => ({ ...p, size: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                      <Input placeholder="Category" value={newKitItem.category} onChange={e => setNewKitItem(p => ({ ...p, category: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <Input placeholder="Price/pc Rs" type="number" value={newKitItem.unit_price} onChange={e => setNewKitItem(p => ({ ...p, unit_price: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                      <Input placeholder="Qty" type="number" value={newKitItem.quantity} onChange={e => setNewKitItem(p => ({ ...p, quantity: e.target.value }))} className="bg-white border-gray-200 h-9 rounded-lg text-xs" />
                      <Button onClick={addKitItem} size="sm" className="h-9 gradient-pink border-0 text-white text-xs rounded-lg"><Plus className="w-3 h-3 mr-1" />Add</Button>
                    </div>
                  </div>
                </div>

                <Input placeholder="Admin Notes" value={newKit.notes} onChange={e => setNewKit(p => ({ ...p, notes: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg text-xs" />

                <Button onClick={saveKit} className="w-full gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
                  <Plus className="w-4 h-4 mr-1" /> Save Decoration Kit
                </Button>
              </CardContent>
            </Card>

            {/* Existing Kits List */}
            <p className="text-xs text-gray-400">{kits.length} decoration kits</p>
            {kits.map(kit => (
              <Card key={kit.id} className="border border-gray-100">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {kit.reference_images?.[0] ? (
                      <img src={kit.reference_images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-pink-50 flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-pink-300" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-700 truncate">{kit.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{kit.occasion_tags?.join(', ')} • {kit.color_theme}</p>
                      <p className="text-[10px] text-gray-400">{(kit.kit_items || []).length} items • Setup: {kit.setup_time_minutes}min</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-pink-500">Rs {kit.final_price}</span>
                        <Badge className={kit.is_active ? 'bg-green-100 text-green-600 text-[9px]' : 'bg-gray-100 text-gray-500 text-[9px]'}>{kit.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                    <button onClick={() => deleteKit(kit.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                  {(kit.kit_items || []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">Kit Contents:</p>
                      {kit.kit_items.slice(0, 5).map((ki, i) => (
                        <p key={i} className="text-[10px] text-gray-400">{ki.quantity}x {ki.name} ({ki.color}) - Rs {ki.unit_price}/pc = Rs {ki.unit_price * ki.quantity}</p>
                      ))}
                      {kit.kit_items.length > 5 && <p className="text-[10px] text-gray-300">+{kit.kit_items.length - 5} more items</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {tab === 'items' && (
          <div className="space-y-3">
            <Card className="border border-pink-100">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-sm text-gray-700 mb-2">Add New Item</h3>
                <Input placeholder="Item Name *" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <Input placeholder="Description" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="h-10 bg-gray-50 rounded-lg px-3 text-sm border border-gray-200">
                    {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                  <Input placeholder="Color" value={newItem.color} onChange={e => setNewItem(p => ({ ...p, color: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Material" value={newItem.material} onChange={e => setNewItem(p => ({ ...p, material: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <Input placeholder="Size" value={newItem.size} onChange={e => setNewItem(p => ({ ...p, size: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Price (Rs) *" type="number" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <Input placeholder="Stock Count" type="number" value={newItem.stock_count} onChange={e => setNewItem(p => ({ ...p, stock_count: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                </div>
                <Input placeholder="Tags (comma-separated)" value={newItem.tags} onChange={e => setNewItem(p => ({ ...p, tags: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <Button onClick={addItem} className="w-full gradient-pink border-0 text-white shadow-pink"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
              </CardContent>
            </Card>
            <p className="text-xs text-gray-400">{items.length} items in inventory</p>
            {items.map(item => (
              <Card key={item.id} className="border border-gray-100">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-pink-400" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{item.category?.replace('_', ' ')} {item.color ? `• ${item.color}` : ''}</p>
                      <div className="flex gap-2 text-[10px] text-gray-400">
                        <span>Rs {item.price}</span>
                        <span>Stock: {item.stock_count}</span>
                        {item.material && <span>• {item.material}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const newStock = prompt('Update stock count:', item.stock_count)
                        if (newStock !== null) updateItem(item.id, { stock_count: Number(newStock) })
                      }} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Edit3 className="w-3 h-3 text-blue-500" /></button>
                      <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {tab === 'delivery' && (
          <div className="space-y-3">
            <Card className="border border-pink-100">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-sm text-gray-700 mb-2">Add Delivery Person</h3>
                <Input placeholder="Name" value={newDp.name} onChange={e => setNewDp(p => ({ ...p, name: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <Input placeholder="Phone" value={newDp.phone} onChange={e => setNewDp(p => ({ ...p, phone: e.target.value }))} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                <Button onClick={addDeliveryPerson} className="w-full gradient-pink border-0 text-white shadow-pink"><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </CardContent>
            </Card>
            {deliveryPersons.map(dp => (
              <Card key={dp.id} className="border border-gray-100">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-pink flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
                  <div><p className="text-sm font-semibold text-gray-700">{dp.name}</p><p className="text-xs text-gray-400">{dp.phone}</p></div>
                  <Badge className={`ml-auto ${dp.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{dp.is_active ? 'Active' : 'Inactive'}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


const DpAuthScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 fade-in">
    <div className="mb-8 text-center">
      <div className="w-20 h-20 gradient-pink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-pink">
        <Truck className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-2xl font-extrabold text-gradient-pink mb-1">FatafatDecor</h1>
      <p className="text-gray-400 text-sm">Decorator / Delivery Partner</p>
    </div>
    <Card className="w-full max-w-sm border border-gray-100 shadow-lg shadow-pink-100/50">
      <CardContent className="p-6 space-y-4">
        <Input placeholder="Phone Number" value={dpAuthForm.phone} onChange={e => setDpAuthForm(p => ({ ...p, phone: e.target.value }))}
          className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
        <Input placeholder="Password (default: 1234)" type="password" value={dpAuthForm.password} onChange={e => setDpAuthForm(p => ({ ...p, password: e.target.value }))}
          className="bg-gray-50 border-gray-200 h-12 rounded-xl" />
        <Button onClick={handleDpLogin} disabled={loading} className="w-full h-12 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login as Decorator'}
        </Button>
        <p className="text-center text-xs text-gray-400">Demo: 9876543210 / 1234</p>
      </CardContent>
    </Card>
  </div>
)
}

const DpHomeScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const today = dpDashboard?.date || new Date().toISOString().split('T')[0]
  const todayOrders = dpDashboard?.today_orders || []
  const activeOrders = dpDashboard?.active_orders || []
  const refreshDp = () => {
    api(`dp/dashboard/${dpUser.id}`).then(d => { if (!d.error) setDpDashboard(d) })
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

const DpOrderScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
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
          <img src={`data:image/png;base64,${o.decorated_image}`} alt="Design" className="w-full h-40 object-cover rounded-xl border border-pink-100" />
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
            await api('dp/update-status', { method: 'POST', body: { order_id: o.id, status: 'en_route' } })
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
                await api('dp/complete', { method: 'POST', body: { order_id: o.id } })
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
                  await api('dp/collect-payment', { method: 'POST', body: { order_id: o.id, dp_id: dpUser.id, amount: Math.round(o.total_cost * 0.5), method: 'cash' } })
                  setDpSelectedOrder(prev => ({ ...prev, payment_status: 'full' }))
                  showToast('Cash collected!', 'success')
                }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl">
                  <Wallet className="w-4 h-4 mr-1" /> Cash
                </Button>
                <Button onClick={async () => {
                  await api('dp/collect-payment', { method: 'POST', body: { order_id: o.id, dp_id: dpUser.id, amount: Math.round(o.total_cost * 0.5), method: 'online' } })
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

const DpVerifyScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const o = dpSelectedOrder
  if (!o) return null
  useEffect(() => { startFaceScan() }, [])
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(SCREENS.DP_ORDER)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <h1 className="font-bold text-lg text-gray-800">Identity Verification</h1>
      </div>
      <div className="px-4 space-y-4">
        {/* Step 1: Face Scan */}
        <Card className="border border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${faceScanImage ? 'bg-green-500' : 'gradient-pink'} text-white`}>
                {faceScanImage ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <h3 className="font-bold text-sm text-gray-700">Face Verification</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Your face will be sent to the customer for security verification.</p>
            {!faceScanImage ? (
              <div>
                <div className="rounded-xl overflow-hidden border border-gray-200 mb-3 bg-black">
                  <video ref={dpVideoRef} className="w-full h-48 object-cover" autoPlay playsInline muted />
                </div>
                <Button onClick={captureFace} className="w-full gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
                  <ScanFace className="w-4 h-4 mr-2" /> Capture Face
                </Button>
              </div>
            ) : (
              <div>
                <img src={faceScanImage} alt="Face" className="w-full h-48 object-cover rounded-xl border border-green-200 mb-3" />
                <div className="flex gap-2">
                  <Button onClick={() => { setFaceScanImage(null); startFaceScan() }} variant="outline" className="flex-1 border-gray-200 rounded-xl">Retake</Button>
                  <Button onClick={() => submitFaceScan(o.id)} disabled={loading} className="flex-1 gradient-pink border-0 text-white rounded-xl shadow-pink">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: OTP Verification */}
        <Card className={`border border-gray-100 ${!faceScanImage ? 'opacity-40 pointer-events-none' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center text-xs font-bold text-white">2</div>
              <h3 className="font-bold text-sm text-gray-700">Enter Customer OTP</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Ask the customer for their 4-digit verification code.</p>
            <div className="flex gap-2">
              <Input placeholder="Enter 4-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-gray-50 border-gray-200 h-14 rounded-xl text-center text-2xl font-bold tracking-[1em]" maxLength={4} />
            </div>
            <Button onClick={() => verifyOtp(o.id)} disabled={loading || otpInput.length !== 4}
              className="w-full h-12 mt-3 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> Verify & Start Decorating</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const DpActiveJobScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
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
          await api('dp/complete', { method: 'POST', body: { order_id: o.id } })
          setDpActiveTimer(null); setDpTimerSeconds(0)
          if (dpTimerRef.current) clearInterval(dpTimerRef.current)
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

const DpCalendarScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const calOrders = dpCalendarData?.orders || []
  const groupedByDate = calOrders.reduce((acc, o) => { const d = o.delivery_slot?.date; if (d) { (acc[d] = acc[d] || []).push(o) } return acc }, {})
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Calendar</h1></div>
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() - 1); setCalMonth(d.toISOString().slice(0, 7)) }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="font-bold text-gray-700">{new Date(calMonth + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => { const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() + 1); setCalMonth(d.toISOString().slice(0, 7)) }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronRight className="w-5 h-5" /></button>
        </div>
        {Object.keys(groupedByDate).length === 0 ? (
          <Card className="border border-gray-100"><CardContent className="p-6 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No bookings this month</p></CardContent></Card>
        ) : Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dateOrders]) => (
          <div key={date}>
            <p className="text-sm font-bold text-pink-500 mb-1">{new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            {dateOrders.sort((a, b) => a.delivery_slot.hour - b.delivery_slot.hour).map(o => (
              <Card key={o.id} className="border border-gray-100 mb-2 cursor-pointer" onClick={async () => {
                const detail = await api(`dp/order-detail/${o.id}`)
                if (!detail.error) { setDpSelectedOrder(detail); navigate(SCREENS.DP_ORDER) }
              }}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center"><Clock className="w-4 h-4 text-pink-500" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">{o.delivery_slot.hour}:00 - {o.delivery_slot.hour + 1}:00</p>
                    <p className="text-xs text-gray-400">#{o.id.slice(0, 8)} • Rs {o.total_cost}</p>
                  </div>
                  <Badge className={`text-[9px] capitalize ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>{o.delivery_status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const DpEarningsScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const [depositAmount, setDepositAmount] = useState('')
  const [depositRef, setDepositRef] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const e = dpEarnings || {}
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="p-4"><h1 className="font-bold text-lg text-gray-800">Earnings & Payments</h1></div>
      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-green-500">Total Collected</p>
              <p className="text-xl font-bold text-green-600">Rs {e.total_collected || 0}</p>
            </CardContent>
          </Card>
          <Card className={`border ${(e.cash_pending || 0) > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}>
            <CardContent className="p-3 text-center">
              <p className={`text-xs ${(e.cash_pending || 0) > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Cash Pending</p>
              <p className={`text-xl font-bold ${(e.cash_pending || 0) > 0 ? 'text-orange-600' : 'text-gray-600'}`}>Rs {e.cash_pending || 0}</p>
            </CardContent>
          </Card>
        </div>

        {(e.cash_pending || 0) > 0 && (
          <Card className="border border-orange-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Deposit Cash</h3>
              <p className="text-xs text-gray-400 mb-3">Deposit collected cash to office or transfer from bank.</p>
              {!showDeposit ? (
                <Button onClick={() => setShowDeposit(true)} className="w-full gradient-pink border-0 text-white rounded-xl shadow-pink">
                  <Building2 className="w-4 h-4 mr-2" /> Deposit Now
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Amount (Rs)" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <Input placeholder="Reference / Receipt No (optional)" value={depositRef} onChange={e => setDepositRef(e.target.value)} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <div className="flex gap-2">
                    <Button onClick={async () => {
                      if (!depositAmount) return
                      await api('dp/deposit-cash', { method: 'POST', body: { dp_id: dpUser.id, amount: Number(depositAmount), deposit_method: 'office_cash', reference_number: depositRef } })
                      showToast('Deposit recorded!', 'success')
                      setShowDeposit(false); setDepositAmount(''); setDepositRef('')
                      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
                    }} className="flex-1 bg-green-500 text-white rounded-lg">
                      <Building2 className="w-4 h-4 mr-1" /> Office
                    </Button>
                    <Button onClick={async () => {
                      if (!depositAmount) return
                      await api('dp/deposit-cash', { method: 'POST', body: { dp_id: dpUser.id, amount: Number(depositAmount), deposit_method: 'bank_transfer', reference_number: depositRef } })
                      showToast('Bank transfer recorded!', 'success')
                      setShowDeposit(false); setDepositAmount(''); setDepositRef('')
                      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
                    }} variant="outline" className="flex-1 border-pink-200 text-pink-500 rounded-lg">
                      <CreditCard className="w-4 h-4 mr-1" /> Bank
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="font-bold text-sm text-gray-700 mb-2">Recent Collections</h3>
          {(e.recent_collections || []).length === 0 ? (
            <p className="text-xs text-gray-400">No collections yet</p>
          ) : (e.recent_collections || []).map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.method === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
                {c.method === 'cash' ? <Wallet className="w-4 h-4 text-green-500" /> : <CreditCard className="w-4 h-4 text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">Rs {c.amount}</p>
                <p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()} • {c.method}</p>
              </div>
              <Badge className={c.deposited ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}>{c.deposited ? 'Deposited' : 'Pending'}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const DpProfileScreen = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Profile</h1></div>
    <div className="px-4 space-y-4">
      <Card className="border border-pink-100 bg-pink-50/30">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-pink"><Truck className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">{dpUser?.name}</h2>
            <p className="text-sm text-gray-400">{dpUser?.phone}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="gradient-pink border-0 text-white">Decorator</Badge>
              <Badge className="bg-yellow-100 text-yellow-600"><Star className="w-3 h-3 mr-1" />{dpUser?.rating || '4.8'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-100">
        <CardContent className="p-4 space-y-1">
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-400 text-sm">Total Deliveries</span><span className="text-sm font-bold">{dpUser?.total_deliveries || 0}</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-400 text-sm">Status</span><Badge className="bg-green-100 text-green-600">Active</Badge></div>
        </CardContent>
      </Card>
      <Button onClick={() => { setDpUser(null); setAppMode('decorator'); navigate(SCREENS.DP_AUTH) }}
        variant="outline" className="w-full h-12 border-red-200 text-red-400 font-semibold rounded-2xl hover:bg-red-50">
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  </div>
)
}

// ===== USER BOTTOM NAV =====
const BottomNav = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  const navItems = [
    { screen: SCREENS.HOME, icon: Home, label: 'Home' },
    { screen: SCREENS.ORDERS, icon: ShoppingBag, label: 'Orders' },
    { screen: SCREENS.UPLOAD, icon: Camera, label: 'Create', center: true },
    { screen: SCREENS.TRACKING, icon: MapPin, label: 'Track' },
    { screen: SCREENS.PROFILE, icon: User, label: 'Profile' }
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map(item => (
            <button key={item.label} onClick={() => { setSelectedOrder(null); setTrackingData(null); navigate(item.screen) }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${screen === item.screen ? 'text-pink-500' : 'text-gray-400'}`}>
              {item.center ? (
                <div className="w-12 h-12 gradient-pink rounded-2xl flex items-center justify-center -mt-5 shadow-lg shadow-pink-300/40">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== DECORATOR BOTTOM NAV =====
const DpBottomNav = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
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

const Toast = () => {
  const { screen, setScreen, prevScreen, setPrevScreen, user, setUser, authMode, setAuthMode, loading, setLoading, toast, setToast, designs, setDesigns, orders, setOrders, items, setItems, deliveryPersons, setDeliveryPersons, selectedDesign, setSelectedDesign, selectedOrder, setSelectedOrder, slots, setSlots, trackingData, setTrackingData, authForm, setAuthForm, uploadForm, setUploadForm, originalImage, setOriginalImage, selectedDate, setSelectedDate, selectedSlotHour, setSelectedSlotHour, seeded, setSeeded, dpUser, setDpUser, dpDashboard, setDpDashboard, dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder, dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData, calMonth, setCalMonth, dpAuthForm, setDpAuthForm, dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds, faceScanImage, setFaceScanImage, otpInput, setOtpInput, appMode, setAppMode, scanImage, setScanImage, scanName, setScanName, scanning, setScanning, scanAnalysis, setScanAnalysis, adminTab, setAdminTab, mapRef, mapInstance, dpVideoRef, dpTimerRef, showToast, navigate, goBack, handleGoogleAuth, handleAuth, handleGenerate, handleCreateOrder, handlePayment, handleBookSlot, loadSlots, handleFileUpload, handleDpLogin, startFaceScan, captureFace, submitFaceScan, verifyOtp, formatTimer } = useApp()
  return toast ? (
  <div className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto slide-up">
    <div className={`p-3 rounded-xl text-sm font-medium text-center shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-pink-500 text-white'}`}>
      {toast.msg}
    </div>
  </div>
  ) : null
}
