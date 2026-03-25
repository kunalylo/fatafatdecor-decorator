'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, CheckCircle2, ScanFace, Loader2, KeyRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS } from '../lib/constants'

export default function DpVerifyScreen() {
  const {
    dpSelectedOrder, faceScanImage, setFaceScanImage, otpInput, setOtpInput,
    loading, dpVideoRef, navigate, startFaceScan, captureFace, submitFaceScan, verifyOtp
  } = useApp()
  const o = dpSelectedOrder
  if (!o) return null
  useEffect(() => { startFaceScan() }, [startFaceScan])
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
