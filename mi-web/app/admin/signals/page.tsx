'use client'
import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiPost } from '@/lib/api'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminSignals() {
  const [signal, setSignal] = useState({
    symbol: 'EUR/USD',
    action: 'BUY',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    notes: ''
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)

  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'XAU/USD']
  const actions = ['BUY', 'SELL', 'CLOSE']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setResult(null)

    try {
      const data = await apiPost('/admin/send-manual-signal', {
        symbol: signal.symbol,
        action: signal.action,
        entry_price: parseFloat(signal.entry_price) || undefined,
        stop_loss: parseFloat(signal.stop_loss) || undefined,
        take_profit: parseFloat(signal.take_profit) || undefined,
        notes: signal.notes || undefined
      })
      setResult({ success: true, message: `Signal sent to ${data.recipient_count} users!` })
      setSignal({ symbol: 'EUR/USD', action: 'BUY', entry_price: '', stop_loss: '', take_profit: '', notes: '' })
    } catch (err) {
      setResult({ success: false, message: 'Failed to send signal' })
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Trading Signal</h1>
          <p className="text-gray-500 mt-1">Broadcast a signal to all active users</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                <select
                  value={signal.symbol}
                  onChange={(e) => setSignal({...signal, symbol: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={signal.action}
                  onChange={(e) => setSignal({...signal, action: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry Price</label>
                <input
                  type="number"
                  step="0.00001"
                  value={signal.entry_price}
                  onChange={(e) => setSignal({...signal, entry_price: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.08500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  value={signal.stop_loss}
                  onChange={(e) => setSignal({...signal, stop_loss: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.08200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  value={signal.take_profit}
                  onChange={(e) => setSignal({...signal, take_profit: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.09000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={signal.notes}
                onChange={(e) => setSignal({...signal, notes: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional notes about this signal..."
              />
            </div>

            {result && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              {sending ? 'Sending...' : 'Send Signal'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
