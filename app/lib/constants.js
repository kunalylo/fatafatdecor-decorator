'use client'

const IK = 'https://ik.imagekit.io/jcp2urr7b'
export const LOGO_URL  = `${IK}/branding/logo.png`
export const ICON_URL  = `${IK}/branding/icon-512.png`

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

export const api = async (path, opts = {}) => {
  try {
    const res = await fetch(`/api/${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    })
    return res.json()
  } catch (e) {
    console.error(`API error [${path}]:`, e.message)
    return { error: 'Network error. Please check your connection.' }
  }
}
