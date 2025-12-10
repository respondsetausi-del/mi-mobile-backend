'use client'
import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiPost } from '@/lib/api'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminSignals() {
  const [signal, setSignal] = useState({
    symbol: 'EURUSD',
    signal_type: 'BUY',
    indicator: 'Manual Signal',
    candle_pattern: 'Admin Signal',
    timeframe: 'H1',
    notes: '',
    duration_seconds: 3600
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)

  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'XAUUSD']
  const signalTypes = ['BUY', 'SELL']
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setResult(null)

    try {
      const data = await apiPost('/admin/send-signal', {
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        indicator: signal.indicator,
        candle_pattern: signal.candle_pattern,
        timeframe: signal.timeframe,
        notes: signal.notes || '',
        duration_seconds: signal.duration_seconds
      })
      setResult({ success: true, message: `Signal sent to ${data.recipient_count} users!` })
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
          <p className="text-gray-500 mt-1">Broadcast a signal to all active paid users</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Signal Type</label>
                <select
                  value={signal.signal_type}
                  onChange={(e) => setSignal({...signal, signal_type: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {signalTypes.map(t => (
                    <option key={t} value={t} className={t === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  value={signal.timeframe}
                  onChange={(e) => setSignal({...signal, timeframe: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={Math.floor(signal.duration_seconds / 60)}
                  onChange={(e) => setSignal({...signal, duration_seconds: parseInt(e.target.value) * 60 || 60})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indicator</label>
              <input
                type="text"
                value={signal.indicator}
                onChange={(e) => setSignal({...signal, indicator: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RSI Divergence, MACD Crossover, etc."
              />
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
