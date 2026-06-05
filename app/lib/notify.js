'use client'

// Notification helpers for the decorator app:
//  • registerServiceWorker / ensureNotificationPermission / subscribeToPush  → Web Push (app closed)
//  • playChime / vibrate                                                     → in-app alert (app open)

// ── Service worker ───────────────────────────────────────────
export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.warn('[notify] SW registration failed:', e.message)
    return null
  }
}

// ── Notification permission (required before push subscribe) ──
export async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try { return await Notification.requestPermission() } catch { return 'denied' }
}

// ── Sound: a short two-tone chime via Web Audio (no asset file) ──
let audioCtx = null
export function primeAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtx = new Ctx()
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
}
export function playChime() {
  try {
    primeAudio()
    if (!audioCtx) return
    const now = audioCtx.currentTime
    ;[[880, 0], [1320, 0.18]].forEach(([freq, offset]) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35)
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.start(now + offset); osc.stop(now + offset + 0.4)
    })
  } catch {}
}

// ── Vibration (Android; ignored on iOS) ──
export function vibrate() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]) } catch {}
}

// ── Web Push subscription ──
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Subscribes this device to push and registers the subscription with the backend.
// `api` is the decorator app's api() helper (passed in to avoid a circular import).
export async function subscribeToPush(reg, api) {
  try {
    if (!reg || !reg.pushManager) return false
    const perm = await ensureNotificationPermission()
    if (perm !== 'granted') return false
    const keyRes = await api('push/vapid-public-key')
    const publicKey = keyRes && keyRes.public_key
    if (!publicKey) { console.warn('[notify] no VAPID key from server — push disabled until VAPID env is set'); return false }
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await api('dp/push-subscribe', { method: 'POST', body: { subscription: sub } })
    return true
  } catch (e) {
    console.warn('[notify] push subscribe failed:', e.message)
    return false
  }
}
