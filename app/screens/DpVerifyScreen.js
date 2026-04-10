'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, CheckCircle2, Camera, Loader2, KeyRound, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS } from '../lib/constants'

export default function DpVerifyScreen() {
  const {
    dpSelectedOrder, setDpSelectedOrder,
    faceScanImage, setFaceScanImage, otpInput, setOtpInput,
    loading, dpVideoRef, navigate, showToast,
    startSelfieCamera, captureSelfie, submitSelfieProof,
    // legacy aliases — kept for backward compat during rollout
    startFaceScan, captureFace, submitFaceScan,
    verifyOtp,
  } = useApp()

  // Prefer new names if available, fall back to legacy
  const openCamera   = startSelfieCamera || startFaceScan
  const capturePhoto = captureSelfie     || captureFace
  const rawSubmit    = submitSelfieProof || submitFaceScan

  // Wrap the submit so we can update local order status after success
  const submitProof = async (orderId) => {
    await rawSubmit(orderId)
    // If it didn't error (which rawSubmit handles via toast),
    // mark the local order as "arrived" + selfie done
    setDpSelectedOrder(prev => prev ? ({
      ...prev,
      delivery_status: 'arrived',
      face_scan: { ...(prev.face_scan || {}), dp_id: 'self' },
      selfie_proof: { captured_at: new Date().toISOString() },
    }) : prev)
  }

  const o = dpSelectedOrder
  useEffect(() => { if (o) openCamera() }, [o, openCamera])
  if (!o) return null

  // If selfie is done (order status arrived), enable OTP section
  const selfieUploaded = faceScanImage && (o.delivery_status === 'arrived' || o.selfie_proof)

  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => navigate(SCREENS.DP_ORDER)}
          className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-800">Check-in at Customer Site</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Honest disclaimer — this is NOT face verification */}
        <div className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Snap a selfie at the customer&apos;s door as proof of arrival. This is
            uploaded for record only — it is <strong>not</strong> biometric
            verification. The customer&apos;s OTP below confirms your identity.
          </p>
        </div>

        {/* Step 1: Selfie Proof */}
        <Card className="border border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${faceScanImage ? 'bg-green-500' : 'gradient-pink'} text-white`}>
                {faceScanImage ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <h3 className="font-bold text-sm text-gray-700">Selfie Proof at Customer Site</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Take a quick selfie so the customer and office have a record of your arrival.
            </p>

            {!faceScanImage ? (
              <div>
                <div className="rounded-xl overflow-hidden border border-gray-200 mb-3 bg-black">
                  <video ref={dpVideoRef} className="w-full h-48 object-cover" autoPlay playsInline muted />
                </div>
                <Button
                  onClick={capturePhoto}
                  className="w-full gradient-pink border-0 text-white font-bold rounded-xl shadow-pink"
                >
                  <Camera className="w-4 h-4 mr-2" /> Capture Selfie
                </Button>
              </div>
            ) : (
              <div>
                <img src={faceScanImage} alt="Selfie" className="w-full h-48 object-cover rounded-xl border border-green-200 mb-3" />
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setFaceScanImage(null); openCamera() }}
                    variant="outline"
                    className="flex-1 border-gray-200 rounded-xl"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={() => submitProof(o.id)}
                    disabled={loading}
                    className="flex-1 gradient-pink border-0 text-white rounded-xl shadow-pink"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Proof'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Customer OTP (the actual identity check) */}
        <Card className={`border border-gray-100 ${!selfieUploaded ? 'opacity-40 pointer-events-none' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full gradient-pink flex items-center justify-center text-xs font-bold text-white">2</div>
              <h3 className="font-bold text-sm text-gray-700">Enter Customer OTP</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Ask the customer for the verification code they received over WhatsApp.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter OTP"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-gray-50 border-gray-200 h-14 rounded-xl text-center text-2xl font-bold tracking-[0.5em]"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            <Button
              onClick={() => verifyOtp(o.id)}
              disabled={loading || (otpInput.length !== 4 && otpInput.length !== 6)}
              className="w-full h-12 mt-3 gradient-pink border-0 text-white font-bold rounded-xl shadow-pink"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> Verify & Start Decorating</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
