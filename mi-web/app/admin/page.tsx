'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { apiGet } from '@/lib/api'
import { Users, UserCheck, DollarSign, UserCog, Key, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Fetch users, mentors, and licenses
      const [usersData, mentorsData, licensesData] = await Promise.all([
        apiGet('/admin/users'),
        apiGet('/admin/mentors').catch(() => []),
        apiGet('/admin/licenses').catch(() => [])
      ])

      // Handle different response formats
      const users = usersData?.users || usersData || []
      const mentors = Array.isArray(mentorsData) ? mentorsData : (mentorsData?.mentors || [])
      const licenses = Array.isArray(licensesData) ? licensesData : (licensesData?.licenses || [])

      console.log('Users:', users.length, 'Mentors:', mentors.length, 'Licenses:', licenses.length)

      // Calculate stats from actual data
      const calculatedStats = {
        user_stats: {
          total: users.length,
          active: users.filter((u: any) => u.status === 'active').length,
          pending: users.filter((u: any) => u.status === 'pending').length,
          paid: users.filter((u: any) => u.payment_status === 'paid').length,
        },
        mentor_stats: {
          total: mentors.length,
          active: mentors.filter((m: any) => m.status === 'active').length,
        },
        license_stats: {
          total: licenses.length,
          used: licenses.filter((l: any) => l.used === true).length,
        },
        revenue_stats: {
          total_revenue: 0, // Reset to $0 as requested
        }
      }

      setStats(calculatedStats)
      setRecentUsers(users.slice(0, 5))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Users"
              value={stats.user_stats?.total || 0}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Active Users"
              value={stats.user_stats?.active || 0}
              icon={UserCheck}
              color="green"
            />
            <StatsCard
              title="Paid Users"
              value={stats.user_stats?.paid || 0}
              icon={DollarSign}
              color="purple"
            />
            <StatsCard
              title="Total Revenue"
              value={`$${stats.revenue_stats?.total_revenue || 0}`}
              icon={DollarSign}
              color="orange"
            />
          </div>
        )}

        {/* Second Row Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="Total Mentors"
              value={stats.mentor_stats?.total || 0}
              icon={UserCog}
              color="purple"
            />
            <StatsCard
              title="Active Licenses"
              value={stats.license_stats?.used || 0}
              icon={Key}
              color="green"
              subtitle={`of ${stats.license_stats?.total || 0} total`}
            />
            <StatsCard
              title="Pending Users"
              value={stats.user_stats?.pending || 0}
              icon={Clock}
              color="orange"
            />
          </div>
        )}

        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users yet</div>
            ) : (
              recentUsers.map((user: any) => (
                <div key={user._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
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
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {user.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.payment_status || 'unpaid'}
                    </span>
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
