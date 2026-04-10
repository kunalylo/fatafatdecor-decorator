'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Truck, Star, LogOut, KeyRound, Wallet, Package, Loader2, Phone, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/constants'

export default function DpProfileScreen() {
  const { dpUser, dpEarnings, handleDpLogout, showToast, loading: globalLoading } = useApp()
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [saving, setSaving] = useState(false)

  const earnings = dpEarnings || {}

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) { showToast('Fill both fields', 'error'); return }
    if (newPwd.length < 4) { showToast('New password must be at least 4 characters', 'error'); return }
    setSaving(true)
    try {
      const data = await api('dp/change-password', {
        method: 'POST',
        body: { current_password: currentPwd, new_password: newPwd }
      })
      if (data.error) { showToast(data.error, 'error'); return }
      showToast('Password changed successfully!', 'success')
      setShowPwdModal(false)
      setCurrentPwd('')
      setNewPwd('')
    } catch { showToast('Failed to change password', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Profile</h1></div>
      <div className="px-4 space-y-4">

        {/* Profile Card */}
        <Card className="border border-pink-100 bg-pink-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-pink">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-gray-800 truncate">{dpUser?.name}</h2>
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{dpUser?.phone}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="gradient-pink border-0 text-white">Decorator</Badge>
                <Badge className="bg-yellow-100 text-yellow-600">
                  <Star className="w-3 h-3 mr-1" />{dpUser?.rating || '5.0'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-gray-100">
            <CardContent className="p-3 text-center">
              <Package className="w-5 h-5 text-pink-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{dpUser?.total_deliveries || 0}</p>
              <p className="text-[10px] text-gray-400">Deliveries</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100">
            <CardContent className="p-3 text-center">
              <Wallet className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">Rs {earnings.total_collected || 0}</p>
              <p className="text-[10px] text-gray-400">Collected</p>
            </CardContent>
          </Card>
          <Card className={`border ${(earnings.cash_pending || 0) > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}>
            <CardContent className="p-3 text-center">
              <Wallet className={`w-5 h-5 mx-auto mb-1 ${(earnings.cash_pending || 0) > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <p className={`text-lg font-bold ${(earnings.cash_pending || 0) > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                Rs {earnings.cash_pending || 0}
              </p>
              <p className="text-[10px] text-gray-400">Cash Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Details */}
        <Card className="border border-gray-100">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-400 text-sm">Status</span>
              <Badge className={dpUser?.is_active === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}>
                {dpUser?.is_active === false ? 'Inactive' : 'Active'}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-400 text-sm">Member Since</span>
              <span className="text-sm text-gray-700">
                {dpUser?.created_at ? new Date(dpUser.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-400 text-sm">Rating</span>
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" /> {dpUser?.rating || '5.0'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Button
          onClick={() => setShowPwdModal(true)}
          variant="outline"
          className="w-full h-12 border-gray-200 text-gray-600 font-semibold rounded-2xl"
        >
          <KeyRound className="w-4 h-4 mr-2" /> Change Password
        </Button>

        {/* Logout */}
        <Button
          onClick={handleDpLogout}
          variant="outline"
          className="w-full h-12 border-red-200 text-red-400 font-semibold rounded-2xl hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>

        <p className="text-[10px] text-center text-gray-300 pt-2">FatafatDecor Decorator App v2.0</p>
      </div>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6">
          <Card className="w-full max-w-sm border-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Change Password</h3>
                <button
                  onClick={() => { setShowPwdModal(false); setCurrentPwd(''); setNewPwd('') }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Current Password"
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-12 rounded-xl"
                />
                <Input
                  placeholder="New Password (min 4 chars)"
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-12 rounded-xl"
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full h-12 gradient-pink border-0 text-white font-bold rounded-xl"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
