'use client'
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiGet, apiPost } from '@/lib/api'
import { Bell, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react'

export default function MentorNews() {
  const [news, setNews] = useState({
    title: '',
    description: '',
    currency: '',
    impact: 'medium',
    event_time: ''
  })
  const [newsList, setNewsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)

  const impacts = ['low', 'medium', 'high']
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD']

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    try {
      // Try to get mentor-specific news or fall back to admin news
      const data = await apiGet('/admin/news').catch(() => ({ news: [] }))
      const list = data.news || data || []
      setNewsList(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to load news:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!news.title) return

    setSending(true)
    setResult(null)

    try {
      await apiPost('/mentor/news', {
        title: news.title,
        description: news.description || '',
        currency: news.currency || 'USD',
        impact: news.impact || 'medium',
        event_time: news.event_time || new Date().toISOString()
      })
      setResult({ success: true, message: 'News sent to your users!' })
      setNews({ title: '', description: '', currency: '', impact: 'medium', event_time: '' })
      loadNews()
    } catch (err) {
      setResult({ success: false, message: 'Failed to send news' })
    } finally {
      setSending(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">News Events</h1>
            <p className="text-gray-500 mt-1">Send news to your users</p>
          </div>
          <button
            onClick={loadNews}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Send News Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send New Event</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                <input
                  type="datetime-local"
                  value={news.event_time}
                  onChange={(e) => setNews({...news, event_time: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={news.description}
                onChange={(e) => setNews({...news, description: e.target.value})}
                rows={2}
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

        {/* News List */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent News ({newsList.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : newsList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No news events yet</p>
              </div>
            ) : (
              newsList.map((item: any) => (
                <div key={item.id || item._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor(item.impact)}`}>
                          {item.impact}
                        </span>
                        {item.currency && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {item.currency}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {item.event_time ? new Date(item.event_time).toLocaleString() : 'No time set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
