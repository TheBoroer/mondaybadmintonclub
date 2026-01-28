'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Player } from '@/lib/supabase'

interface SessionWithPlayers extends Session {
  players: Player[]
  waitlist: Player[]
}

export default function SignupPage() {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelPin, setCancelPin] = useState('')
  const [cancelError, setCancelError] = useState('')
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      // Fetch all active sessions
      const sessionRes = await fetch('/api/sessions')
      if (!sessionRes.ok) throw new Error('Failed to load sessions')
      const sessionsData: Session[] = await sessionRes.json()

      // Fetch players for each session
      const sessionsWithPlayers = await Promise.all(
        sessionsData.map(async (session) => {
          const playersRes = await fetch(`/api/players?sessionId=${session.id}`)
          const playersData: Player[] = playersRes.ok ? await playersRes.json() : []
          return {
            ...session,
            players: playersData.filter(p => !p.is_waitlist),
            waitlist: playersData.filter(p => p.is_waitlist),
          }
        })
      )

      setSessions(sessionsWithPlayers)

      // Select first session by default if none selected
      if (!selectedSessionId && sessionsWithPlayers.length > 0) {
        setSelectedSessionId(sessionsWithPlayers[0].id)
      }
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedSessionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selectedSession = sessions.find(s => s.id === selectedSessionId)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSession || !name.trim() || !pin) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSession.id, name: name.trim(), pin }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sign up')
      }

      setName('')
      setPin('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelClick = (playerId: string) => {
    setCancellingId(playerId)
    setCancelPin('')
    setCancelError('')
  }

  const handleCancelConfirm = async () => {
    if (!cancellingId || !cancelPin) return

    try {
      const res = await fetch(`/api/players?playerId=${cancellingId}&pin=${cancelPin}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setCancelError(data.error || 'Failed to cancel')
        return
      }

      setCancellingId(null)
      setCancelPin('')
      setCancelError('')
      await fetchData()
    } catch {
      setCancelError('Failed to cancel. Please try again.')
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

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

        {/* Session Tabs */}
        {sessions.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedSessionId === session.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {formatShortDate(session.date)}
                <span className="ml-2 text-xs opacity-75">
                  ({session.players.length}/{session.max_players})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Session Info */}
        {selectedSession && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-2">
              {formatDate(selectedSession.date)}
            </h2>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>{selectedSession.courts} {selectedSession.courts === 1 ? 'Court' : 'Courts'}</span>
              <span>|</span>
              <span>{selectedSession.players.length}/{selectedSession.max_players} Players</span>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Sign Up</h3>
          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your name"
              required
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(val)
                }}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Last 4 digits of phone number"
                inputMode="numeric"
                maxLength={4}
                required
              />
              <button
                type="submit"
                disabled={submitting || !name.trim() || pin.length !== 4}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {submitting ? '...' : (selectedSession?.players.length ?? 0) >= (selectedSession?.max_players || 0) ? 'Join Waitlist' : 'Sign Up'}
              </button>
            </div>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Player List */}
        {selectedSession && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Signed Up ({selectedSession.players.length}/{selectedSession.max_players})
            </h3>
            {selectedSession.players.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No players signed up yet</p>
            ) : (
              <ul className="divide-y divide-gray-700">
                {selectedSession.players.map((player, index) => (
                  <li key={player.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-medium text-sm">
                          {index + 1}
                        </span>
                        <span className="text-gray-100">{player.name}</span>
                      </div>
                      <button
                        onClick={() => handleCancelClick(player.id)}
                        className="text-red-400 hover:text-red-300 text-sm underline"
                      >
                        Cancel
                      </button>
                    </div>
                    {cancellingId === player.id && (
                      <div className="mt-3 ml-11 flex items-center gap-2">
                        <input
                          type="text"
                          value={cancelPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setCancelPin(val)
                          }}
                          className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center"
                          placeholder="PIN"
                          inputMode="numeric"
                          maxLength={4}
                          autoFocus
                        />
                        <button
                          onClick={handleCancelConfirm}
                          disabled={cancelPin.length !== 4}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setCancellingId(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        {cancelError && <span className="text-red-400 text-xs">{cancelError}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Waitlist */}
        {selectedSession && selectedSession.waitlist.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Waitlist ({selectedSession.waitlist.length})
            </h3>
            <ul className="divide-y divide-gray-700">
              {selectedSession.waitlist.map((player, index) => (
                <li key={player.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-medium text-sm">
                        W{index + 1}
                      </span>
                      <span className="text-gray-100">{player.name}</span>
                    </div>
                    <button
                      onClick={() => handleCancelClick(player.id)}
                      className="text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Cancel
                    </button>
                  </div>
                  {cancellingId === player.id && (
                    <div className="mt-3 ml-11 flex items-center gap-2">
                      <input
                        type="text"
                        value={cancelPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setCancelPin(val)
                        }}
                        className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center"
                        placeholder="PIN"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                      />
                      <button
                        onClick={handleCancelConfirm}
                        disabled={cancelPin.length !== 4}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setCancellingId(null)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                      {cancelError && <span className="text-red-400 text-xs">{cancelError}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-sm text-gray-500 hover:text-indigo-400"
          >
            Admin Login
          </a>
        </div>
      </div>
    </main>
  )
}
