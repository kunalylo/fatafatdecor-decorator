'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Building2, CreditCard, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/constants'

export default function DpEarningsScreen() {
  const { dpUser, dpEarnings, setDpEarnings, showToast } = useApp()
  const [depositAmount, setDepositAmount] = useState('')
  const [depositRef, setDepositRef] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const e = dpEarnings || {}
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="p-4"><h1 className="font-bold text-lg text-gray-800">Earnings & Payments</h1></div>
      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-green-500">Total Collected</p>
              <p className="text-xl font-bold text-green-600">Rs {e.total_collected || 0}</p>
            </CardContent>
          </Card>
          <Card className={`border ${(e.cash_pending || 0) > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}>
            <CardContent className="p-3 text-center">
              <p className={`text-xs ${(e.cash_pending || 0) > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Cash Pending</p>
              <p className={`text-xl font-bold ${(e.cash_pending || 0) > 0 ? 'text-orange-600' : 'text-gray-600'}`}>Rs {e.cash_pending || 0}</p>
            </CardContent>
          </Card>
        </div>

        {(e.cash_pending || 0) > 0 && (
          <Card className="border border-orange-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Deposit Cash</h3>
              <p className="text-xs text-gray-400 mb-3">Deposit collected cash to office or transfer from bank.</p>
              {!showDeposit ? (
                <Button onClick={() => setShowDeposit(true)} className="w-full gradient-pink border-0 text-white rounded-xl shadow-pink">
                  <Building2 className="w-4 h-4 mr-2" /> Deposit Now
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Amount (Rs)" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <Input placeholder="Reference / Receipt No (optional)" value={depositRef} onChange={e => setDepositRef(e.target.value)} className="bg-gray-50 border-gray-200 h-10 rounded-lg" />
                  <div className="flex gap-2">
                    <Button onClick={async () => {
                      if (!depositAmount) return
                      await api('dp/deposit-cash', { method: 'POST', body: { dp_id: dpUser.id, amount: Number(depositAmount), deposit_method: 'office_cash', reference_number: depositRef } })
                      showToast('Deposit recorded!', 'success')
                      setShowDeposit(false); setDepositAmount(''); setDepositRef('')
                      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
                    }} className="flex-1 bg-green-500 text-white rounded-lg">
                      <Building2 className="w-4 h-4 mr-1" /> Office
                    </Button>
                    <Button onClick={async () => {
                      if (!depositAmount) return
                      await api('dp/deposit-cash', { method: 'POST', body: { dp_id: dpUser.id, amount: Number(depositAmount), deposit_method: 'bank_transfer', reference_number: depositRef } })
                      showToast('Bank transfer recorded!', 'success')
                      setShowDeposit(false); setDepositAmount(''); setDepositRef('')
                      api(`dp/earnings/${dpUser.id}`).then(d => { if (!d.error) setDpEarnings(d) })
                    }} variant="outline" className="flex-1 border-pink-200 text-pink-500 rounded-lg">
                      <CreditCard className="w-4 h-4 mr-1" /> Bank
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="font-bold text-sm text-gray-700 mb-2">Recent Collections</h3>
          {(e.recent_collections || []).length === 0 ? (
            <p className="text-xs text-gray-400">No collections yet</p>
          ) : (e.recent_collections || []).map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.method === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
                {c.method === 'cash' ? <Wallet className="w-4 h-4 text-green-500" /> : <CreditCard className="w-4 h-4 text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">Rs {c.amount}</p>
                <p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()} • {c.method}</p>
              </div>
              <Badge className={c.deposited ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}>{c.deposited ? 'Deposited' : 'Pending'}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
