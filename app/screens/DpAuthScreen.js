'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Star, Shield, Zap, ArrowRight, ChevronLeft, MessageCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LOGO_URL, SUPPORT_PHONE } from '../lib/constants'

export default function DpAuthScreen() {
  const { loading, dpAuthForm, setDpAuthForm, handleDpLogin } = useApp()
  // 'landing' | 'apply' | 'login'
  const [view, setView] = useState('landing')

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      "Hi FatafatDecor team! I'd like to apply to become a decorator partner. Please guide me through the process."
    )
    window.open(`https://wa.me/91${SUPPORT_PHONE}?text=${msg}`, '_blank')
  }

  /* ── Landing Page ── */
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white flex flex-col fade-in">

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
          <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 shadow-xl">
            <img src={LOGO_URL} alt="FatafatDecor" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-gradient-pink mb-2 text-center">FatafatDecor</h1>
          <p className="text-gray-500 text-sm text-center mb-1">Decorator Partner App</p>
          <p className="text-gray-400 text-xs text-center max-w-xs">
            Join our network of professional decorators and grow your business
          </p>
        </div>

        {/* Perks */}
        <div className="px-6 pb-6 space-y-3">
          {[
            { icon: Zap,    title: 'Get Jobs Instantly',   sub: 'Receive decoration orders right on your phone' },
            { icon: Star,   title: 'Earn More',            sub: 'Set your own schedule and maximize earnings' },
            { icon: Shield, title: 'Verified & Trusted',   sub: 'Join a platform customers trust for quality' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-4 bg-pink-50/60 rounded-2xl p-4">
              <div className="w-10 h-10 gradient-pink rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">{title}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-10 space-y-3">
          {/* Primary: Get Certified → apply screen */}
          <Button
            onClick={() => setView('apply')}
            className="w-full h-14 gradient-pink border-0 text-white font-bold text-base rounded-2xl shadow-pink flex items-center justify-center gap-2"
          >
            <Star className="w-5 h-5" />
            Get Certified Decorator
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>

          {/* Secondary: Already a decorator → login */}
          <button
            onClick={() => setView('login')}
            className="w-full py-4 text-sm font-semibold text-pink-500 rounded-2xl border-2 border-pink-200 hover:bg-pink-50 transition-all"
          >
            Already a Decorator? Login
          </button>
        </div>
      </div>
    )
  }

  /* ── Apply / Become a Decorator ── */
  if (view === 'apply') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 fade-in">
        <div className="w-full max-w-sm">

          {/* Back */}
          <button
            onClick={() => setView('landing')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 shadow-xl">
              <img src={LOGO_URL} alt="FatafatDecor" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-extrabold text-gradient-pink mb-1">Become a Decorator</h1>
            <p className="text-gray-400 text-sm">Join the FatafatDecor partner network</p>
          </div>

          <Card className="w-full border border-gray-100 shadow-lg shadow-pink-100/50">
            <CardContent className="p-6 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed text-center">
                To become a certified FatafatDecor decorator, please contact our team.
                We&apos;ll verify your details and set up your partner account so you can
                start receiving decoration orders.
              </p>

              {/* WhatsApp CTA */}
              <Button
                onClick={openWhatsApp}
                className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5b] border-0 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Contact us on WhatsApp
              </Button>

              <p className="text-xs text-center text-gray-400">
                Already a decorator?{' '}
                <button onClick={() => setView('login')} className="text-pink-500 font-semibold">
                  Login
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /* ── Login Form ── */
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 fade-in">
      <div className="w-full max-w-sm">

        {/* Back */}
        <button
          onClick={() => setView('landing')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 shadow-xl">
            <img src={LOGO_URL} alt="FatafatDecor" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-gradient-pink mb-1">Welcome Back</h1>
          <p className="text-gray-400 text-sm">Sign in to your decorator account</p>
        </div>

        <Card className="w-full border border-gray-100 shadow-lg shadow-pink-100/50">
          <CardContent className="p-6 space-y-4">
            <Input
              placeholder="Phone Number"
              value={dpAuthForm.phone}
              onChange={e => setDpAuthForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-gray-50 border-gray-200 h-12 rounded-xl"
            />
            <Input
              placeholder="Password"
              type="password"
              value={dpAuthForm.password}
              onChange={e => setDpAuthForm(p => ({ ...p, password: e.target.value }))}
              className="bg-gray-50 border-gray-200 h-12 rounded-xl"
            />
            <Button
              onClick={handleDpLogin}
              disabled={loading}
              className="w-full h-12 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </Button>
            <p className="text-xs text-center text-gray-400">
              Not registered?{' '}
              <button onClick={() => setView('apply')} className="text-pink-500 font-semibold">
                Get Certified
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
