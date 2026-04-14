'use client'

const IK = 'https://ik.imagekit.io/jcp2urr7b'
export const LOGO_URL  = `${IK}/branding/logo.png?v=3`
export const ICON_URL  = `${IK}/branding/icon-512.png?v=3`

export const SCREENS = {
  DP_AUTH: 'dp_auth', DP_HOME: 'dp_home', DP_ORDER: 'dp_order',
  DP_CALENDAR: 'dp_calendar', DP_EARNINGS: 'dp_earnings', DP_PROFILE: 'dp_profile',
  DP_VERIFY: 'dp_verify', DP_ACTIVE_JOB: 'dp_active_job', DP_GIFT_ORDER: 'dp_gift_order'
}

export const ROOM_TYPES = ['Dining Room', 'Living Room', 'Bedroom', 'Balcony', 'Garden', 'Hall', 'Office', 'Terrace']

export const OCCASIONS = ['birthday', 'anniversary', 'wedding', 'dinner', 'party', 'baby_shower', 'engagement', 'corporate', 'festival', 'housewarming']

export const BUDGET_BRACKETS = [
  { id: 'budget_1', label: 'Rs 3,000 - 5,000', min: 3000, max: 5000 },
  { id: 'budget_2', label: 'Rs 5,000 - 10,000', min: 5000, max: 10000 },
  { id: 'budget_3', label: 'Rs 10,000 - 15,000', min: 10000, max: 15000 },
  { id: 'budget_4', label: 'Rs 15,000 - 20,000', min: 15000, max: 20000 },
  { id: 'budget_5', label: 'Rs 20,000 - 30,000', min: 20000, max: 30000 },
  { id: 'budget_6', label: 'Rs 30,000 - 50,000', min: 30000, max: 50000 }
]

export const CREDIT_PACKAGES = [
  { credits: 1, price: 150, label: 'Single Credit' },
  { credits: 5, price: 590, label: '5 Credits', popular: true },
  { credits: 10, price: 950, label: '10 Credits' }
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// Endpoints where a 401 should NOT trigger an auto-logout event —
// because the user is actively attempting to log in / hasn't authenticated yet.
const AUTH_ENDPOINTS = new Set(['dp/login'])

export const api = async (path, opts = {}) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dp_token') : null
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const url = API_BASE ? `${API_BASE}/api/${path}` : `/api/${path}`
    const res = await fetch(url, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    })
    // 401 on any non-login endpoint means our token is expired / rejected.
    // Fire an event so the AppContext can force a clean logout.
    if (res.status === 401 && !AUTH_ENDPOINTS.has(path) && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dp_token')
        localStorage.removeItem('fd_dp_user')
        window.dispatchEvent(new CustomEvent('dp:auth-expired'))
      } catch {}
    }
    // If the server didn't return JSON (e.g. 502 from a proxy), don't blow up
    const text = await res.text()
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return { error: `Unexpected server response (${res.status})` }
    }
  } catch (e) {
    console.error(`API error [${path}]:`, e.message)
    return { error: 'Network error. Please check your connection.' }
  }
}
