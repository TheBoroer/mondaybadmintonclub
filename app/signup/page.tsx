'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Player } from '@/lib/supabase'

export default function SignupPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [waitlist, setWaitlist] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      // Fetch session
      const sessionRes = await fetch('/api/sessions')
      if (!sessionRes.ok) throw new Error('Failed to load session')
      const sessionData = await sessionRes.json()
      setSession(sessionData)

      // Fetch players
      const playersRes = await fetch(`/api/players?sessionId=${sessionData.id}`)
      if (!playersRes.ok) throw new Error('Failed to load players')
      const playersData: Player[] = await playersRes.json()

      setPlayers(playersData.filter(p => !p.is_waitlist))
      setWaitlist(playersData.filter(p => p.is_waitlist))
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !name.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, name: name.trim() }),
      })

      if (!res.ok) throw new Error('Failed to sign up')

      setName('')
      await fetchData()
    } catch {
      setError('Failed to sign up. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (playerId: string) => {
    if (!confirm('Are you sure you want to cancel your signup?')) return

    try {
      const res = await fetch(`/api/players?playerId=${playerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to cancel')

      await fetchData()
    } catch {
      setError('Failed to cancel. Please try again.')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user' }),
    })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Monday Badminton Club</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Logout
          </button>
        </div>

        {/* Session Info */}
        {session && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-2">
              {formatDate(session.date)}
            </h2>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>{session.courts} {session.courts === 1 ? 'Court' : 'Courts'}</span>
              <span>|</span>
              <span>{players.length}/{session.max_players} Players</span>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Sign Up</h3>
          <form onSubmit={handleSignup} className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your name"
              required
            />
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Signing up...' : players.length >= (session?.max_players || 0) ? 'Join Waitlist' : 'Sign Up'}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Player List */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Signed Up ({players.length}/{session?.max_players || 0})
          </h3>
          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No players signed up yet</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {players.map((player, index) => (
                <li key={player.id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-medium text-sm">
                      {index + 1}
                    </span>
                    <span className="text-gray-100">{player.name}</span>
                  </div>
                  <button
                    onClick={() => handleCancel(player.id)}
                    className="text-red-400 hover:text-red-300 text-sm underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Waitlist */}
        {waitlist.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Waitlist ({waitlist.length})
            </h3>
            <ul className="divide-y divide-gray-700">
              {waitlist.map((player, index) => (
                <li key={player.id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-medium text-sm">
                      W{index + 1}
                    </span>
                    <span className="text-gray-100">{player.name}</span>
                  </div>
                  <button
                    onClick={() => handleCancel(player.id)}
                    className="text-red-400 hover:text-red-300 text-sm underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
