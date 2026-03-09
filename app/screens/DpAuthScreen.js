'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Truck, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function DpAuthScreen() {
  const { loading, dpAuthForm, setDpAuthForm, handleDpLogin } = useApp()
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
      </CardContent>
    </Card>
  </div>
)
}
