'use client'
import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiPost } from '@/lib/api'
import { Bell, CheckCircle, AlertCircle } from 'lucide-react'

export default function MentorNews() {
  const [news, setNews] = useState({
    title: '',
    description: '',
    currency: '',
    impact: 'medium',
    event_time: ''
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)

  const impacts = ['low', 'medium', 'high']
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!news.title) return

    setSending(true)
    setResult(null)

    try {
      const data = await apiPost('/mentor/send-manual-news', {
        title: news.title,
        description: news.description || undefined,
        currency: news.currency || undefined,
        impact: news.impact || undefined,
        event_time: news.event_time || undefined
      })
      setResult({ success: true, message: `News sent to ${data.recipient_count} users!` })
      setNews({ title: '', description: '', currency: '', impact: 'medium', event_time: '' })
    } catch (err) {
      setResult({ success: false, message: 'Failed to send news' })
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send News Event</h1>
          <p className="text-gray-500 mt-1">Broadcast news to your users</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={news.title}
                onChange={(e) => setNews({...news, title: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Fed Interest Rate Decision"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={news.currency}
                  onChange={(e) => setNews({...news, currency: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select currency</option>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                <select
                  value={news.impact}
                  onChange={(e) => setNews({...news, impact: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {impacts.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
              <input
                type="datetime-local"
                value={news.event_time}
                onChange={(e) => setNews({...news, event_time: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={news.description}
                onChange={(e) => setNews({...news, description: e.target.value})}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Details about the news event..."
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
              disabled={sending || !news.title}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bell size={18} />
              {sending ? 'Sending...' : 'Send News'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
