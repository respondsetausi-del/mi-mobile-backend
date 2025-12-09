'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiGet, apiPost } from '@/lib/api'
import { Key, Plus, Search, RefreshCw, Copy, Check } from 'lucide-react'

export default function MentorLicenses() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [filteredLicenses, setFilteredLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all')
  const [generating, setGenerating] = useState(false)
  const [generateCount, setGenerateCount] = useState(1)
  const [copiedKey, setCopiedKey] = useState('')

  useEffect(() => {
    loadLicenses()
  }, [])

  useEffect(() => {
    filterLicenses()
  }, [licenses, search, filter])

  const loadLicenses = async () => {
    try {
      const data = await apiGet('/mentor/licenses')
      setLicenses(data.licenses || [])
    } catch (err) {
      console.error('Failed to load licenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterLicenses = () => {
    let result = [...licenses]
    
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l => 
        l.key?.toLowerCase().includes(s) || 
        l.assigned_to?.toLowerCase().includes(s)
      )
    }
    
    if (filter === 'used') result = result.filter(l => l.status === 'used')
    if (filter === 'unused') result = result.filter(l => l.status !== 'used')
    
    setFilteredLicenses(result)
  }

  const generateLicenses = async () => {
    setGenerating(true)
    try {
      await apiPost('/mentor/licenses/generate', { count: generateCount })
      loadLicenses()
    } catch (err) {
      console.error('Failed to generate licenses:', err)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const usedCount = licenses.filter(l => l.status === 'used').length
  const unusedCount = licenses.filter(l => l.status !== 'used').length

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Licenses</h1>
            <p className="text-gray-500 mt-1">
              {usedCount} used · {unusedCount} available
            </p>
          </div>
          <button
            onClick={loadLicenses}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Generate Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Licenses</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="number"
                min={1}
                max={100}
                value={generateCount}
                onChange={(e) => setGenerateCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Number of licenses"
              />
            </div>
            <button
              onClick={generateLicenses}
              disabled={generating}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} />
              {generating ? 'Generating...' : `Generate ${generateCount} License${generateCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by key or assigned user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Licenses</option>
            <option value="used">Used</option>
            <option value="unused">Available</option>
          </select>
        </div>

        {/* Licenses Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="p-8 text-center">
              <Key size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No licenses found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">License Key</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Assigned To</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Created</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLicenses.map((license) => (
                  <tr key={license._id || license.key} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono">
                        {license.key}
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        license.status === 'used' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {license.status === 'used' ? 'Used' : 'Available'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {license.assigned_to || '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {license.created_at ? new Date(license.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => copyToClipboard(license.key)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === license.key ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
