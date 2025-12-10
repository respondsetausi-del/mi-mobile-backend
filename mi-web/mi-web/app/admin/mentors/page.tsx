'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Modal from '@/components/Modal'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { Search, UserPlus, UserCheck, UserX, Trash2, Key, RefreshCw, Users } from 'lucide-react'

export default function AdminMentors() {
  const [mentors, setMentors] = useState<any[]>([])
  const [filteredMentors, setFilteredMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedMentor, setSelectedMentor] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  const [newMentor, setNewMentor] = useState({
    email: '',
    name: '',
    company_name: '',
    max_users: 50,
    max_licenses: 100
  })

  useEffect(() => {
    loadMentors()
  }, [])

  useEffect(() => {
    filterMentors()
  }, [mentors, search, filter])

  const loadMentors = async () => {
    try {
      const data = await apiGet('/admin/mentors')
      // API returns array directly, not {mentors: []}
      const mentorsList = Array.isArray(data) ? data : (data.mentors || [])
      setMentors(mentorsList)
      console.log('Loaded mentors:', mentorsList.length)
    } catch (err) {
      console.error('Failed to load mentors:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterMentors = () => {
    let result = [...mentors]
    
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(m => 
        m.email?.toLowerCase().includes(s) || 
        m.name?.toLowerCase().includes(s) ||
        m.mentor_id?.toLowerCase().includes(s)
      )
    }
    
    if (filter === 'active') result = result.filter(m => m.status === 'active')
    if (filter === 'inactive') result = result.filter(m => m.status !== 'active')
    
    setFilteredMentors(result)
  }

  const handleActivate = async (mentor: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/admin/mentors/${mentor._id}/activate`, {})
      loadMentors()
    } catch (err) {
      console.error('Failed to activate mentor:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (mentor: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/admin/mentors/${mentor._id}/deactivate`, {})
      loadMentors()
    } catch (err) {
      console.error('Failed to deactivate mentor:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMentor) return
    setActionLoading(true)
    try {
      await apiDelete(`/admin/mentors/${selectedMentor._id}`)
      setShowDeleteModal(false)
      setSelectedMentor(null)
      loadMentors()
    } catch (err) {
      console.error('Failed to delete mentor:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await apiPost('/admin/mentors', newMentor)
      setShowCreateModal(false)
      setNewMentor({ email: '', name: '', company_name: '', max_users: 50, max_licenses: 100 })
      loadMentors()
    } catch (err) {
      console.error('Failed to create mentor:', err)
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
            <h1 className="text-2xl font-bold text-gray-900">Mentors</h1>
            <p className="text-gray-500 mt-1">{mentors.length} total mentors</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadMentors}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white flex items-center gap-2"
            >
              <UserPlus size={18} />
              Add Mentor
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or mentor ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Mentors</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Mentors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No mentors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => (
              <div key={mentor._id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-lg">
                        {(mentor.name || mentor.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{mentor.name || 'No name'}</p>
                      <p className="text-sm text-purple-600 font-medium">{mentor.mentor_id}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    mentor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {mentor.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">{mentor.email}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{mentor.user_count || 0}</p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{mentor.max_users || 50}</p>
                    <p className="text-xs text-gray-500">Max Users</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {mentor.status === 'active' ? (
                    <button
                      onClick={() => handleDeactivate(mentor)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                    >
                      <UserX size={16} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(mentor)}
                      className="flex-1 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-xl text-sm font-medium text-green-700 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} />
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedMentor(mentor)
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

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Mentor"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedMentor?.name || selectedMentor?.email}</strong>? 
            This will also remove all their license keys and data.
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

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Mentor"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={newMentor.email}
              onChange={(e) => setNewMentor({...newMentor, email: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="mentor@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={newMentor.name}
              onChange={(e) => setNewMentor({...newMentor, name: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={newMentor.company_name}
              onChange={(e) => setNewMentor({...newMentor, company_name: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Trading Academy"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input
                type="number"
                value={newMentor.max_users}
                onChange={(e) => setNewMentor({...newMentor, max_users: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Licenses</label>
              <input
                type="number"
                value={newMentor.max_licenses}
                onChange={(e) => setNewMentor({...newMentor, max_licenses: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={actionLoading || !newMentor.email || !newMentor.name}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : 'Create Mentor'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
