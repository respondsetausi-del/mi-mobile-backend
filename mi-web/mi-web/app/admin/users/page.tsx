'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Modal from '@/components/Modal'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { Search, UserCheck, UserX, Trash2, Key, MoreVertical, RefreshCw, Download, Filter } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'paid' | 'unpaid'>('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, search, filter])

  const loadUsers = async () => {
    try {
      const data = await apiGet('/admin/users')
      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let result = [...users]
    
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(u => 
        u.email?.toLowerCase().includes(s) || 
        u.name?.toLowerCase().includes(s)
      )
    }
    
    if (filter === 'active') result = result.filter(u => u.status === 'active')
    if (filter === 'pending') result = result.filter(u => u.status === 'pending')
    if (filter === 'paid') result = result.filter(u => u.payment_status === 'paid')
    if (filter === 'unpaid') result = result.filter(u => u.payment_status !== 'paid')
    
    setFilteredUsers(result)
  }

  const handleApprove = async (user: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/admin/users/${user._id}/approve`, {})
      loadUsers()
    } catch (err) {
      console.error('Failed to approve user:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeny = async (user: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/admin/users/${user._id}/deny`, {})
      loadUsers()
    } catch (err) {
      console.error('Failed to deny user:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await apiDelete(`/admin/users/${selectedUser._id}`)
      setShowDeleteModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiPost(`/admin/users/${selectedUser._id}/reset-password`, {})
      setTempPassword(data.temporary_password)
    } catch (err) {
      console.error('Failed to reset password:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const exportCSV = async () => {
    try {
      const data = await apiGet('/admin/export/users')
      const blob = new Blob([data.content], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      a.click()
    } catch (err) {
      console.error('Failed to export:', err)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-500 mt-1">{users.length} total users</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
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
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Payment</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Mentor</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Created</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {(user.name || user.email)?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' : 
                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {user.mentor_id || '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user)}
                              className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                              title="Approve"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              onClick={() => handleDeny(user)}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                              title="Deny"
                            >
                              <UserX size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setTempPassword('')
                            setShowResetModal(true)
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                          title="Reset Password"
                        >
                          <Key size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedUser?.email}</strong>? This action cannot be undone.
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

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Password"
        size="sm"
      >
        <div className="space-y-4">
          {tempPassword ? (
            <>
              <p className="text-gray-600">Temporary password generated for <strong>{selectedUser?.email}</strong>:</p>
              <div className="bg-gray-100 p-4 rounded-xl font-mono text-lg text-center select-all">
                {tempPassword}
              </div>
              <p className="text-sm text-gray-500">User will be required to change this password on next login.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword)
                  alert('Password copied to clipboard!')
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white"
              >
                Copy Password
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Generate a temporary password for <strong>{selectedUser?.email}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
