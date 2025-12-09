'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`https://mi-mobile-backend-1.onrender.com/api/${role}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('role', role)
        router.push(`/${role}`)
      } else {
        setError('Invalid credentials')
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg w-96 border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">MI Mobile Dashboard</h1>
        
        <div className="flex gap-2 mb-4">
          <button onClick={() => setRole('admin')} className={`flex-1 py-2 rounded ${role === 'admin' ? 'bg-cyan-500' : 'bg-gray-800'} text-white`}>Admin</button>
          <button onClick={() => setRole('mentor')} className={`flex-1 py-2 rounded ${role === 'mentor' ? 'bg-purple-500' : 'bg-gray-800'} text-white`}>Mentor</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white py-2 rounded hover:bg-cyan-600">
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
