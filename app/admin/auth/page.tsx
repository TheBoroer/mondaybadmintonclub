'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth?type=admin')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace('/admin')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, type: 'admin' }),
      })

      if (res.ok) {
        router.push('/admin')
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center court-bg p-4">
        <div className="text-emerald-200 text-xl animate-pulse">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen court-bg p-4 relative">
      {/* Flying shuttlecocks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-shuttle-fly absolute top-1/4 text-4xl" style={{ animationDelay: '-2s' }}>🏸</div>
        <div className="animate-shuttle-fly absolute top-1/2 text-3xl" style={{ animationDelay: '-5s' }}>🏸</div>
        <div className="animate-shuttle-fly absolute top-3/4 text-2xl" style={{ animationDelay: '-7s' }}>🏸</div>
      </div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pt-4">
          <a href="/signup" className="flex items-center gap-2 text-emerald-200 hover:text-yellow-400 transition-colors">
            <span className="text-2xl">🏸</span>
            <span className="font-semibold">Monday Badminton</span>
          </a>
          <nav className="flex items-center gap-4">
            <a href="/signup" className="text-sm text-emerald-200 hover:text-yellow-400 transition-colors">
              Sign Up
            </a>
            <span className="text-emerald-200/30">|</span>
            <span className="text-sm text-yellow-400 font-medium">
              Admin
            </span>
          </nav>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 animate-bounce-in">
          {/* Logo/Icon */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-float">🛡️</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Login
            </h1>
            <p className="text-emerald-200 text-sm">Court management zone</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-emerald-100 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-400/30 rounded-xl text-white placeholder-emerald-200/50 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all backdrop-blur"
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 animate-wiggle">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 py-3 px-4 rounded-xl font-bold hover:from-yellow-300 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shuttle-cursor"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🏸</span> Checking...
                </span>
              ) : (
                "Enter Dashboard"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
