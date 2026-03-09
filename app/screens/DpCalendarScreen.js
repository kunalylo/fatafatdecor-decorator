'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SCREENS, api } from '../lib/constants'

export default function DpCalendarScreen() {
  const {
    dpCalendarData, calMonth, setCalMonth, setDpSelectedOrder, navigate
  } = useApp()
  const calOrders = dpCalendarData?.orders || []
  const groupedByDate = calOrders.reduce((acc, o) => { const d = o.delivery_slot?.date; if (d) { (acc[d] = acc[d] || []).push(o) } return acc }, {})
  return (
    <div className="slide-up pb-24 bg-white min-h-screen">
      <div className="p-4"><h1 className="font-bold text-lg text-gray-800">My Calendar</h1></div>
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() - 1); setCalMonth(d.toISOString().slice(0, 7)) }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="font-bold text-gray-700">{new Date(calMonth + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => { const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() + 1); setCalMonth(d.toISOString().slice(0, 7)) }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100"><ChevronRight className="w-5 h-5" /></button>
        </div>
        {Object.keys(groupedByDate).length === 0 ? (
          <Card className="border border-gray-100"><CardContent className="p-6 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No bookings this month</p></CardContent></Card>
        ) : Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dateOrders]) => (
          <div key={date}>
            <p className="text-sm font-bold text-pink-500 mb-1">{new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            {dateOrders.sort((a, b) => a.delivery_slot.hour - b.delivery_slot.hour).map(o => (
              <Card key={o.id} className="border border-gray-100 mb-2 cursor-pointer" onClick={async () => {
                const detail = await api(`dp/order-detail/${o.id}`)
                if (!detail.error) { setDpSelectedOrder(detail); navigate(SCREENS.DP_ORDER) }
              }}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center"><Clock className="w-4 h-4 text-pink-500" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">{o.delivery_slot.hour}:00 - {o.delivery_slot.hour + 1}:00</p>
                    <p className="text-xs text-gray-400">#{o.id.slice(0, 8)} • Rs {o.total_cost}</p>
                  </div>
                  <Badge className={`text-[9px] capitalize ${o.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>{o.delivery_status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
