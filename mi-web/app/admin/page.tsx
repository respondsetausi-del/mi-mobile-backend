'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './globals.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    // Fetch analytics
    fetch('https://mi-mobile-backend-1.onrender.com/api/admin/analytics/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setStats)

    // Fetch users
    fetch('https://mi-mobile-backend-1.onrender.com/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => setUsers(d.users || []))
  }, [])

  const logout = () => {
    localStorage.clear()
    router.push('/')
  }

  const exportUsers = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('https://mi-mobile-backend-1.onrender.com/api/admin/export/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    const blob = new Blob([data.content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = data.filename
    a.click()
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button onClick={logout} className="bg-red-500 px-4 py-2 rounded">Logout</button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Total Users</p>
              <p className="text-3xl font-bold">{stats.user_stats.total}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Active Users</p>
              <p className="text-3xl font-bold">{stats.user_stats.active}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Paid Users</p>
              <p className="text-3xl font-bold">{stats.user_stats.paid}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold">${stats.revenue_stats.total_revenue}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Users</h2>
            <button onClick={exportUsers} className="bg-cyan-500 px-4 py-2 rounded text-sm">Export CSV</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Payment</th>
                <th className="text-left py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user._id} className="border-b border-gray-800">
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${user.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}>
                      {user.payment_status}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
