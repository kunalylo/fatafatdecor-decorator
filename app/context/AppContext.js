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
      if (saved) {
        const parsed = JSON.parse(saved)
        setDpUser(parsed)
        setScreen(SCREENS.DP_HOME)
      }
    } catch (e) { localStorage.removeItem('fd_dp_user') }
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
      }
    })
  }, [])

  useEffect(() => {
    if (dpUser) {
      refreshDashboard(dpUser.id)
      api(`dp/orders/${dpUser.id}`).then(d => { if (!d.error) setDpOrders(d) })
      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
      // Poll for new incoming orders every 15s
      const orderPoll = setInterval(() => refreshDashboard(dpUser.id), 15000)
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
        return () => { clearInterval(gpsInterval); clearInterval(orderPoll) }
      }
      return () => clearInterval(orderPoll)
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
            try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hZmpvaXB0eH18fX17eXd2dXV2eHp9f4GDhYaIiImIh4WDgX57eHVycW9ub3BydHd6fYCDhomLjI2NjIuJh4WCf3x5dnNxb25ubm9xc3Z5fICDhomMjY+Pj46MioeEgX57eHVycG9ubm5ub3Fzdn').play() } catch(e) {}
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

  const handleDpLogout = () => {
    setDpUser(null)
    setDpDashboard(null)
    setDpOrders([])
    setDpSelectedOrder(null)
    setPendingOrders([])
    setScreen(SCREENS.DP_AUTH)
    showToast('Logged out', 'success')
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

  const handleAcceptOrder = async (orderId) => {
    setLoading(true)
    try {
      const data = await api('dp/accept-order', { method: 'POST', body: { order_id: orderId, dp_id: dpUser.id } })
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
      const data = await api('dp/decline-order', { method: 'POST', body: { order_id: orderId, dp_id: dpUser.id } })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Order declined.', 'info')
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (e) { showToast('Failed to decline order', 'error') }
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
    dpVideoRef, dpTimerRef,
    showToast, navigate, goBack,
    handleDpLogin, handleDpLogout, startFaceScan, captureFace, submitFaceScan,
    verifyOtp, handleAcceptOrder, handleDeclineOrder,
    refreshDashboard, formatTimer
  }

  return <AppContext.Provider value={ctxValue}>{children}</AppContext.Provider>
}
