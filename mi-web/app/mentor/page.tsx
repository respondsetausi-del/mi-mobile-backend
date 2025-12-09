'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './globals.css'

export default function MentorDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    // Fetch mentor analytics
    fetch('https://mi-mobile-backend-1.onrender.com/api/mentor/analytics/my-users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setStats)

    // Fetch mentor's users
    fetch('https://mi-mobile-backend-1.onrender.com/api/mentor/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => setUsers(d.users || []))
  }, [])

  const logout = () => {
    localStorage.clear()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mentor Dashboard</h1>
          <button onClick={logout} className="bg-red-500 px-4 py-2 rounded">Logout</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">My Users</p>
              <p className="text-3xl font-bold">{stats.user_stats.total}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Active</p>
              <p className="text-3xl font-bold">{stats.user_stats.active}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded border border-gray-800">
              <p className="text-gray-400">Revenue</p>
              <p className="text-3xl font-bold">${stats.revenue_stats.total_revenue}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded border border-gray-800">
          <h2 className="text-xl font-bold mb-4">My Users</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Payment</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
