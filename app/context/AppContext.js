'use client'

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { SCREENS, api } from '../lib/constants'

export const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [screen, setScreen] = useState(SCREENS.DP_AUTH)
  const [prevScreen, setPrevScreen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [dpUser, setDpUser] = useState(null)
  const [dpDashboard, setDpDashboard] = useState(null)
  const [dpOrders, setDpOrders] = useState([])
  const [dpSelectedOrder, setDpSelectedOrder] = useState(null)
  const [pendingOrders, setPendingOrders] = useState([])
  const [pendingGiftOrders, setPendingGiftOrders] = useState([])
  const [dpSelectedGiftOrder, setDpSelectedGiftOrder] = useState(null)
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
    else setScreen(SCREENS.DP_HOME)
  }, [prevScreen])

  // ── Persist session to localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fd_dp_user')
      const token = localStorage.getItem('dp_token')
      // Require BOTH user object + JWT to restore a session. If either is
      // missing (e.g. upgraded from a pre-JWT build), force re-login.
      if (saved && token) {
        const parsed = JSON.parse(saved)
        setDpUser(parsed)
        setScreen(SCREENS.DP_HOME)
      } else {
        localStorage.removeItem('fd_dp_user')
        localStorage.removeItem('dp_token')
      }
    } catch (e) {
      localStorage.removeItem('fd_dp_user')
      localStorage.removeItem('dp_token')
    }
    // Restore active timer if decorator had a job in progress
    try {
      const timerData = localStorage.getItem('fd_dp_timer')
      if (timerData) {
        const { orderId, endTime } = JSON.parse(timerData)
        const remaining = Math.floor((endTime - Date.now()) / 1000)
        if (remaining > 0) {
          setDpActiveTimer(orderId)
          setDpTimerSeconds(remaining)
        } else {
          localStorage.removeItem('fd_dp_timer')
        }
      }
    } catch (e) { localStorage.removeItem('fd_dp_timer') }
  }, [])

  useEffect(() => {
    if (dpUser) {
      try { localStorage.setItem('fd_dp_user', JSON.stringify(dpUser)) } catch (e) {}
    } else {
      localStorage.removeItem('fd_dp_user')
    }
  }, [dpUser])

  // ===== DECORATOR APP - DATA LOADING =====
  const refreshDashboard = useCallback((uid) => {
    api(`dp/dashboard/${uid}`).then(d => {
      if (!d.error) {
        setDpDashboard(d)
        setPendingOrders(d.pending_orders || [])
        if (d.pending_gift_orders) setPendingGiftOrders(d.pending_gift_orders)
      }
    })
  }, [])

  useEffect(() => {
    if (!dpUser) return
    refreshDashboard(dpUser.id)
    api(`dp/orders/${dpUser.id}`).then(d => { if (!d.error) setDpOrders(d) })
    api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
    // Poll for new incoming orders every 15s
    const orderPoll = setInterval(() => refreshDashboard(dpUser.id), 15000)
    return () => clearInterval(orderPoll)
  }, [dpUser?.id, refreshDashboard])

  // GPS: only track location while there is an active order in en_route/
  // arrived/decorating status. When idle, we don't burn battery or hit the
  // API. Uses watchPosition so we don't spawn overlapping timers.
  useEffect(() => {
    if (!dpUser || typeof navigator === 'undefined' || !navigator.geolocation) return
    const activeOrders = (dpDashboard?.active_orders || [])
      .filter(o => ['en_route', 'arrived', 'decorating'].includes(o.delivery_status))
    if (activeOrders.length === 0) return

    let cancelled = false
    const push = (pos) => {
      if (cancelled) return
      api('delivery/update-location', {
        method: 'POST',
        body: { lat: pos.coords.latitude, lng: pos.coords.longitude }
      }).catch(() => {})
    }
    // Immediate fix
    navigator.geolocation.getCurrentPosition(push, () => {}, { enableHighAccuracy: true })
    // Continuous updates — fires only when the device actually moves
    const watchId = navigator.geolocation.watchPosition(push, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    })
    return () => {
      cancelled = true
      try { navigator.geolocation.clearWatch(watchId) } catch {}
    }
  }, [dpUser?.id, dpDashboard?.active_orders])

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
            try { localStorage.removeItem('fd_dp_timer') } catch {}
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
      // Save JWT so the `api()` helper sends it in the Authorization header
      if (data.token) {
        try { localStorage.setItem('dp_token', data.token) } catch {}
      }
      // Strip token out of the persisted user object — no need to store twice
      const { token, ...userOnly } = data
      setDpUser(userOnly)
      showToast(`Welcome, ${userOnly.name}!`, 'success')
      navigate(SCREENS.DP_HOME)
    } catch (e) { showToast('Login failed', 'error') }
    finally { setLoading(false) }
  }

  const wipeSession = useCallback(() => {
    try {
      localStorage.removeItem('dp_token')
      localStorage.removeItem('fd_dp_user')
      localStorage.removeItem('fd_dp_timer')
    } catch {}
    setDpUser(null)
    setDpDashboard(null)
    setDpOrders([])
    setDpSelectedOrder(null)
    setPendingOrders([])
    setPendingGiftOrders([])
    setDpSelectedGiftOrder(null)
    setDpEarnings(null)
    setDpCalendarData(null)
    setDpActiveTimer(null)
    setDpTimerSeconds(0)
    setFaceScanImage(null)
    setOtpInput('')
    setDpAuthForm({ phone: '', password: '' })
    setScreen(SCREENS.DP_AUTH)
  }, [])

  const handleDpLogout = () => {
    wipeSession()
    showToast('Logged out', 'success')
  }

  // Listen for 401-driven forced logouts from the api() helper.
  useEffect(() => {
    const onAuthExpired = () => {
      wipeSession()
      showToast('Session expired. Please log in again.', 'error')
    }
    window.addEventListener('dp:auth-expired', onAuthExpired)
    return () => window.removeEventListener('dp:auth-expired', onAuthExpired)
  }, [wipeSession, showToast])

  const startSelfieCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (dpVideoRef.current) {
        dpVideoRef.current.srcObject = stream
        dpVideoRef.current.play()
      }
    } catch (e) { showToast('Camera access denied', 'error') }
  }

  const captureSelfie = () => {
    if (!dpVideoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 480; canvas.height = 360
    canvas.getContext('2d').drawImage(dpVideoRef.current, 0, 0, 480, 360)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    setFaceScanImage(dataUrl)
    const stream = dpVideoRef.current.srcObject
    if (stream) stream.getTracks().forEach(t => t.stop())
  }

  const submitSelfieProof = async (orderId) => {
    if (!faceScanImage) { showToast('Please capture a selfie first', 'error'); return }
    setLoading(true)
    try {
      // Attach GPS coords if available — gives the backend a "was at site" audit
      let lat, lng
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
          )
          lat = pos.coords.latitude; lng = pos.coords.longitude
        } catch {}
      }
      const data = await api('dp/selfie-proof', {
        method: 'POST',
        body: { order_id: orderId, selfie_image: faceScanImage, lat, lng }
      })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Selfie proof uploaded. Now enter customer OTP.', 'success')
    } catch (e) { showToast('Upload failed', 'error') }
    finally { setLoading(false) }
  }

  // Legacy aliases for any components still importing the old names
  const startFaceScan = startSelfieCamera
  const captureFace = captureSelfie
  const submitFaceScan = submitSelfieProof

  const verifyOtp = async (orderId) => {
    // Accept 4- or 6-digit OTP (backend now issues 6-digit but old orders may still have 4)
    if (!otpInput || (otpInput.length !== 4 && otpInput.length !== 6)) {
      showToast('Enter 4- or 6-digit OTP', 'error'); return
    }
    setLoading(true)
    try {
      const data = await api('dp/verify-otp', { method: 'POST', body: { order_id: orderId, otp: otpInput } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('OTP verified. Decoration started.', 'success')
      // Start 1-hour timer (3600 seconds) and persist end time to localStorage
      const endTime = Date.now() + 3600 * 1000
      try { localStorage.setItem('fd_dp_timer', JSON.stringify({ orderId, endTime })) } catch {}
      setDpTimerSeconds(3600)
      setDpActiveTimer(orderId)
      setDpSelectedOrder(prev => ({ ...prev, delivery_status: 'decorating' }))
      navigate(SCREENS.DP_ACTIVE_JOB)
    } catch (e) { showToast('OTP verification failed', 'error') }
    finally { setLoading(false) }
  }

  const handleAcceptOrder = async (orderId) => {
    setLoading(true)
    try {
      const data = await api('dp/accept-order', { method: 'POST', body: { order_id: orderId } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast(data.message || 'Order accepted!', 'success')
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      refreshDashboard(dpUser.id)
      api(`dp/orders/${dpUser.id}`).then(d => { if (!d.error) setDpOrders(d) })
      // Navigate to order detail immediately
      const detail = await api(`dp/order-detail/${orderId}`)
      if (!detail.error) { setDpSelectedOrder(detail); navigate(SCREENS.DP_ORDER) }
    } catch (e) { showToast('Failed to accept order', 'error') }
    finally { setLoading(false) }
  }

  const handleDeclineOrder = async (orderId) => {
    setLoading(true)
    try {
      const data = await api('dp/decline-order', { method: 'POST', body: { order_id: orderId } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Order declined.', 'info')
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (e) { showToast('Failed to decline order', 'error') }
    finally { setLoading(false) }
  }

  const handleAcceptGiftOrder = async (orderId) => {
    setLoading(true)
    try {
      const data = await api('dp/accept-gift-order', { method: 'POST', body: { order_id: orderId } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Gift order accepted!', 'success')
      setPendingGiftOrders(prev => prev.filter(o => o.id !== orderId))
      const detail = await api(`dp/gift-order-detail/${orderId}`)
      if (!detail.error) { setDpSelectedGiftOrder(detail); navigate(SCREENS.DP_GIFT_ORDER) }
    } catch { showToast('Failed to accept', 'error') }
    finally { setLoading(false) }
  }

  const handleDeclineGiftOrder = async (orderId) => {
    setLoading(true)
    try {
      const data = await api('dp/decline-gift-order', { method: 'POST', body: { order_id: orderId } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Gift order declined', 'info')
      setPendingGiftOrders(prev => prev.filter(o => o.id !== orderId))
    } catch { showToast('Failed to decline', 'error') }
    finally { setLoading(false) }
  }

  const handleUpdateGiftStatus = async (orderId, status) => {
    setLoading(true)
    try {
      const data = await api('dp/update-gift-status', { method: 'POST', body: { order_id: orderId, status } })
      if (data.error) { showToast(data.error, 'error'); return }
      setDpSelectedGiftOrder(prev => ({ ...prev, delivery_status: status }))
      showToast(`Status updated: ${status}`, 'success')
    } catch { showToast('Update failed', 'error') }
    finally { setLoading(false) }
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const ctxValue = {
    screen, setScreen, prevScreen, setPrevScreen,
    loading, setLoading, toast, setToast,
    dpUser, setDpUser, dpDashboard, setDpDashboard,
    dpOrders, setDpOrders, dpSelectedOrder, setDpSelectedOrder,
    dpEarnings, setDpEarnings, dpCalendarData, setDpCalendarData,
    calMonth, setCalMonth, dpAuthForm, setDpAuthForm,
    dpActiveTimer, setDpActiveTimer, dpTimerSeconds, setDpTimerSeconds,
    faceScanImage, setFaceScanImage, otpInput, setOtpInput,
    pendingOrders, setPendingOrders,
    pendingGiftOrders, setPendingGiftOrders,
    dpSelectedGiftOrder, setDpSelectedGiftOrder,
    dpVideoRef, dpTimerRef,
    showToast, navigate, goBack,
    handleDpLogin, handleDpLogout,
    // New names
    startSelfieCamera, captureSelfie, submitSelfieProof,
    // Legacy aliases (still exported so old screens don't break)
    startFaceScan, captureFace, submitFaceScan,
    verifyOtp, handleAcceptOrder, handleDeclineOrder,
    handleAcceptGiftOrder, handleDeclineGiftOrder, handleUpdateGiftStatus,
    refreshDashboard, formatTimer
  }

  return <AppContext.Provider value={ctxValue}>{children}</AppContext.Provider>
}
