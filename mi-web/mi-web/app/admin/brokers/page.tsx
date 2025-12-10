'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Modal from '@/components/Modal'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { Search, Plus, Trash2, RefreshCw, ExternalLink, Building2 } from 'lucide-react'

export default function AdminBrokers() {
  const [brokers, setBrokers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBroker, setSelectedBroker] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  const [newBroker, setNewBroker] = useState({
    broker_name: '',
    broker_image: '',
    affiliate_link: '',
    description: ''
  })

  useEffect(() => {
    loadBrokers()
  }, [])

  const loadBrokers = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/admin/brokers')
      setBrokers(data.brokers || data || [])
    } catch (err) {
      console.error('Failed to load brokers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBrokers = brokers.filter(b => 
    b.broker_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!newBroker.broker_name || !newBroker.affiliate_link) return
    
    setActionLoading(true)
    try {
      await apiPost('/admin/brokers', newBroker)
      setShowAddModal(false)
      setNewBroker({ broker_name: '', broker_image: '', affiliate_link: '', description: '' })
      loadBrokers()
    } catch (err) {
      console.error('Failed to add broker:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBroker) return
    
    setActionLoading(true)
    try {
      await apiDelete(`/admin/brokers/${selectedBroker._id}`)
      setShowDeleteModal(false)
      setSelectedBroker(null)
      loadBrokers()
    } catch (err) {
      console.error('Failed to delete broker:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brokers</h1>
            <p className="text-gray-500 mt-1">{brokers.length} affiliate brokers</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadBrokers}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white flex items-center gap-2"
            >
              <Plus size={18} />
              Add Broker
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search brokers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Brokers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-16 w-16 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        ) : filteredBrokers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No brokers found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white"
            >
              Add Your First Broker
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrokers.map((broker) => (
              <div key={broker._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {broker.broker_image ? (
                      <img 
                        src={broker.broker_image} 
                        alt={broker.broker_name}
                        className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Broker'
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 size={24} className="text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{broker.broker_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        broker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {broker.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {broker.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{broker.description}</p>
                )}
                
                <div className="flex gap-2">
                  <a
                    href={broker.affiliate_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-sm font-medium text-blue-700 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    View Link
                  </a>
                  <button
                    onClick={() => {
                      setSelectedBroker(broker)
                      setShowDeleteModal(true)
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Broker Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Broker"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name *</label>
            <input
              type="text"
              value={newBroker.broker_name}
              onChange={(e) => setNewBroker({...newBroker, broker_name: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., XM Trading"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={newBroker.broker_image}
              onChange={(e) => setNewBroker({...newBroker, broker_image: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Link *</label>
            <input
              type="text"
              value={newBroker.affiliate_link}
              onChange={(e) => setNewBroker({...newBroker, affiliate_link: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://broker.com/ref=yourcode"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newBroker.description}
              onChange={(e) => setNewBroker({...newBroker, description: e.target.value})}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of the broker..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={actionLoading || !newBroker.broker_name || !newBroker.affiliate_link}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white disabled:opacity-50"
            >
              {actionLoading ? 'Adding...' : 'Add Broker'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Broker"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedBroker?.broker_name}</strong>? 
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium text-white disabled:opacity-50"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
