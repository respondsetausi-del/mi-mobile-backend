'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiGet, apiPut } from '@/lib/api'
import { Palette, Save, CheckCircle, AlertCircle } from 'lucide-react'

export default function MentorBranding() {
  const [branding, setBranding] = useState({
    system_name: '',
    background_color: '#1e1e1e'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null)

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = async () => {
    try {
      const data = await apiGet('/mentor/dashboard')
      setBranding({
        system_name: data.system_name || '',
        background_color: data.background_color || '#1e1e1e'
      })
    } catch (err) {
      console.error('Failed to load branding:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSystemName = async () => {
    setSaving(true)
    setResult(null)
    try {
      await apiPut('/mentor/branding/system-name', { system_name: branding.system_name })
      setResult({ success: true, message: 'System name updated!' })
    } catch (err) {
      setResult({ success: false, message: 'Failed to update' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBackground = async () => {
    setSaving(true)
    setResult(null)
    try {
      await apiPut('/mentor/branding/background', { 
        background_color: branding.background_color
      })
      setResult({ success: true, message: 'Background updated!' })
    } catch (err) {
      setResult({ success: false, message: 'Failed to update' })
    } finally {
      setSaving(false)
    }
  }

  const presetColors = [
    '#1e1e1e', '#0f172a', '#1a1a2e', '#16213e', '#1f2937',
    '#134e4a', '#164e63', '#1e3a5f', '#312e81', '#4c1d95'
  ]

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
          <p className="text-gray-500 mt-1">Customize how your app appears to users</p>
        </div>

        {result && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {result.message}
          </div>
        )}

        {/* System Name */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Name</h2>
              <p className="text-sm text-gray-500">This appears in your users' app</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <input
              type="text"
              value={branding.system_name}
              onChange={(e) => setBranding({...branding, system_name: e.target.value})}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="My Trading System"
            />
            <button
              onClick={handleSaveSystemName}
              disabled={saving}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Background Color */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Background Color</h2>
          <p className="text-sm text-gray-500 mb-4">Choose a background color for your app</p>
          
          {/* Preset Colors */}
          <div className="flex flex-wrap gap-3 mb-4">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => setBranding({...branding, background_color: color})}
                className={`w-12 h-12 rounded-xl border-2 transition-all ${
                  branding.background_color === color 
                    ? 'border-purple-500 ring-2 ring-purple-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Custom Color */}
          <div className="flex gap-4 items-center mb-4">
            <input
              type="color"
              value={branding.background_color}
              onChange={(e) => setBranding({...branding, background_color: e.target.value})}
              className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={branding.background_color}
              onChange={(e) => setBranding({...branding, background_color: e.target.value})}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              placeholder="#1e1e1e"
            />
          </div>

          {/* Preview */}
          <div 
            className="w-full h-32 rounded-xl mb-4 flex items-center justify-center"
            style={{ backgroundColor: branding.background_color }}
          >
            <span className="text-white text-lg font-semibold">
              {branding.system_name || 'Preview'}
            </span>
          </div>

          <button
            onClick={handleSaveBackground}
            disabled={saving}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Background'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
