'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Modal from '@/components/Modal'
import { apiGet, apiPost } from '@/lib/api'
import { Search, UserCheck, UserX, Key, RefreshCw, Users } from 'lucide-react'

export default function MentorUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
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
      const data = await apiGet('/mentor/users')
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
    
    setFilteredUsers(result)
  }

  const handleActivate = async (user: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/mentor/users/${user._id}/activate`, {})
      loadUsers()
    } catch (err) {
      console.error('Failed to activate user:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (user: any) => {
    setActionLoading(true)
    try {
      await apiPost(`/mentor/users/${user._id}/deactivate`, {})
      loadUsers()
    } catch (err) {
      console.error('Failed to deactivate user:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiPost(`/mentor/users/${selectedUser._id}/reset-password`, {})
      setTempPassword(data.temporary_password)
    } catch (err) {
      console.error('Failed to reset password:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Users</h1>
            <p className="text-gray-500 mt-1">{users.length} total users</p>
          </div>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
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
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Payment</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">License Key</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-medium">
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
                        user.payment_status === 'paid' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {user.license_key ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {user.license_key}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleDeactivate(user)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <UserX size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user)}
                            className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                            title="Activate"
                          >
                            <UserCheck size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setTempPassword('')
                            setShowResetModal(true)
                          }}
                          className="p-2 hover:bg-purple-100 rounded-lg text-purple-600 transition-colors"
                          title="Reset Password"
                        >
                          <Key size={18} />
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
              <p className="text-gray-600">Temporary password for <strong>{selectedUser?.email}</strong>:</p>
              <div className="bg-gray-100 p-4 rounded-xl font-mono text-lg text-center select-all">
                {tempPassword}
              </div>
              <p className="text-sm text-gray-500">User must change this on next login.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword)
                  alert('Password copied!')
                }}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white"
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
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white disabled:opacity-50"
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
