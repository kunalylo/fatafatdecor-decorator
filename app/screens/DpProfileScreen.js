'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Truck, Star, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function DpProfileScreen() {
  const { dpUser, handleDpLogout } = useApp()
  return (
  <div className="slide-up pb-24 bg-white min-h-screen">
    <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Profile</h1></div>
    <div className="px-4 space-y-4">
      <Card className="border border-pink-100 bg-pink-50/30">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-pink flex items-center justify-center shadow-pink"><Truck className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">{dpUser?.name}</h2>
            <p className="text-sm text-gray-400">{dpUser?.phone}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="gradient-pink border-0 text-white">Decorator</Badge>
              <Badge className="bg-yellow-100 text-yellow-600"><Star className="w-3 h-3 mr-1" />{dpUser?.rating || '4.8'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-100">
        <CardContent className="p-4 space-y-1">
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-400 text-sm">Total Deliveries</span><span className="text-sm font-bold">{dpUser?.total_deliveries || 0}</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-400 text-sm">Status</span><Badge className="bg-green-100 text-green-600">Active</Badge></div>
        </CardContent>
      </Card>
      <Button onClick={handleDpLogout}
        variant="outline" className="w-full h-12 border-red-200 text-red-400 font-semibold rounded-2xl hover:bg-red-50">
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  </div>
)
}
