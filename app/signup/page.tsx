'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [justSignedUp, setJustSignedUp] = useState(false)

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
      setJustSignedUp(true)
      setTimeout(() => setJustSignedUp(false), 2000)
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
      <main className="min-h-screen flex items-center justify-center court-bg">
        <div className="text-2xl text-emerald-200 flex items-center gap-3">
          <span className="animate-spin text-4xl">🏸</span>
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen court-bg p-4 relative">
      {/* Decorative shuttlecocks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="animate-shuttle-fly absolute top-20 text-4xl" style={{ animationDelay: '-3s' }}>🏸</div>
        <div className="animate-shuttle-fly absolute top-40 text-3xl" style={{ animationDelay: '-6s' }}>🏸</div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <a href="/signup" className="flex items-center gap-2 text-emerald-200 hover:text-yellow-400 transition-colors">
            <span className="text-2xl animate-float">🏸</span>
            <span className="font-semibold">Monday Badminton</span>
          </a>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-yellow-400 font-medium">
              Sign Up
            </span>
            <span className="text-emerald-200/30">|</span>
            <a href="/admin/auth" className="text-sm text-emerald-200 hover:text-yellow-400 transition-colors">
              Admin
            </a>
          </nav>
        </div>

        {/* Session Tabs */}
        {sessions.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all transform hover:scale-105 ${
                  selectedSessionId === session.id
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-lg'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20 border border-white/20'
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-2">
              {formatDate(selectedSession.date)}
            </h2>
            <div className="flex gap-4 text-sm text-emerald-200">
              <span>🏟️ {selectedSession.courts} {selectedSession.courts === 1 ? 'Court' : 'Courts'}</span>
              <span>|</span>
              <span>👥 {selectedSession.players.length}/{selectedSession.max_players} Players</span>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>✍️</span> Sign Up
          </h3>
          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-400/30 rounded-xl text-white placeholder-emerald-200/50 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
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
                className="flex-1 px-4 py-3 bg-white/10 border border-emerald-400/30 rounded-xl text-white placeholder-emerald-200/50 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                placeholder="Last 4 digits of phone number"
                inputMode="numeric"
                maxLength={4}
                required
              />
              <button
                type="submit"
                disabled={submitting || !name.trim() || pin.length !== 4}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-xl font-bold hover:from-yellow-300 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap shuttle-cursor"
              >
                {submitting ? (
                  <span className="animate-spin">🏸</span>
                ) : justSignedUp ? (
                  '🎉'
                ) : (selectedSession?.players.length ?? 0) >= (selectedSession?.max_players || 0) ? (
                  'Join Waitlist'
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-3 bg-red-500/20 border border-red-400/50 rounded-lg p-3 animate-wiggle">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Player List */}
        {selectedSession && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏆</span> Signed Up ({selectedSession.players.length}/{selectedSession.max_players})
            </h3>
            {selectedSession.players.length === 0 ? (
              <p className="text-emerald-200/60 text-center py-4">No players signed up yet. Be the first! 🥇</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {selectedSession.players.map((player, index) => (
                  <li key={player.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-gray-900' :
                          index === 1 ? 'bg-gray-300 text-gray-900' :
                          index === 2 ? 'bg-orange-400 text-gray-900' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                        </span>
                        <span className="text-white">{player.name}</span>
                      </div>
                      <button
                        onClick={() => handleCancelClick(player.id)}
                        className="text-red-400 hover:text-red-300 text-sm hover:underline transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {cancellingId === player.id && (
                      <div className="mt-3 ml-11 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={cancelPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setCancelPin(val)
                          }}
                          className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center"
                          placeholder="PIN"
                          inputMode="numeric"
                          maxLength={4}
                          autoFocus
                        />
                        <button
                          onClick={handleCancelConfirm}
                          disabled={cancelPin.length !== 4}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-400 disabled:opacity-50 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setCancellingId(null)}
                          className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>⏳</span> Waitlist ({selectedSession.waitlist.length})
            </h3>
            <ul className="divide-y divide-white/10">
              {selectedSession.waitlist.map((player, index) => (
                <li key={player.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        W{index + 1}
                      </span>
                      <span className="text-white">{player.name}</span>
                    </div>
                    <button
                      onClick={() => handleCancelClick(player.id)}
                      className="text-red-400 hover:text-red-300 text-sm hover:underline transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {cancellingId === player.id && (
                    <div className="mt-3 ml-11 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={cancelPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setCancelPin(val)
                        }}
                        className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center"
                        placeholder="PIN"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                      />
                      <button
                        onClick={handleCancelConfirm}
                        disabled={cancelPin.length !== 4}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-400 disabled:opacity-50 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setCancellingId(null)}
                        className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
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

      </div>
    </main>
  )
}
