'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Player } from '@/lib/supabase'

interface SessionWithPlayers extends Session {
  players: Player[]
  waitlist: Player[]
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      // Fetch all sessions
      const sessionsRes = await fetch('/api/sessions?includeArchived=true')
      if (!sessionsRes.ok) throw new Error('Failed to load sessions')
      const sessionsData: Session[] = await sessionsRes.json()

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

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'admin' }),
    })
    router.push('/admin')
  }

  const handleCourtChange = async (sessionId: string, courts: number) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, courts }),
      })

      if (!res.ok) throw new Error('Failed to update')
      await fetchData()
    } catch {
      setError('Failed to update courts')
    }
  }

  const handleTogglePaid = async (playerId: string, currentPaid: boolean) => {
    try {
      const res = await fetch('/api/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, paid: !currentPaid }),
      })

      if (!res.ok) throw new Error('Failed to update')
      await fetchData()
    } catch {
      setError('Failed to update payment status')
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return

    try {
      const res = await fetch(`/api/players?playerId=${playerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to remove')
      await fetchData()
    } catch {
      setError('Failed to remove player')
    }
  }

  const handleArchiveSession = async (sessionId: string, archived: boolean) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, archived }),
      })

      if (!res.ok) throw new Error('Failed to update')
      await fetchData()
    } catch {
      setError('Failed to archive session')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </main>
    )
  }

  const activeSessions = sessions.filter(s => !s.archived)
  const archivedSessions = sessions.filter(s => s.archived)

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Active Sessions */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sessions</h2>
        {activeSessions.length === 0 ? (
          <p className="text-gray-500 mb-8">No active sessions</p>
        ) : (
          activeSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onCourtChange={handleCourtChange}
              onTogglePaid={handleTogglePaid}
              onRemovePlayer={handleRemovePlayer}
              onArchive={handleArchiveSession}
              formatDate={formatDate}
            />
          ))
        )}

        {/* Archived Sessions */}
        {archivedSessions.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Archived Sessions</h2>
            {archivedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onCourtChange={handleCourtChange}
                onTogglePaid={handleTogglePaid}
                onRemovePlayer={handleRemovePlayer}
                onArchive={handleArchiveSession}
                formatDate={formatDate}
                isArchived
              />
            ))}
          </>
        )}
      </div>
    </main>
  )
}

interface SessionCardProps {
  session: SessionWithPlayers
  onCourtChange: (id: string, courts: number) => void
  onTogglePaid: (playerId: string, currentPaid: boolean) => void
  onRemovePlayer: (playerId: string) => void
  onArchive: (id: string, archived: boolean) => void
  formatDate: (dateStr: string) => string
  isArchived?: boolean
}

function SessionCard({
  session,
  onCourtChange,
  onTogglePaid,
  onRemovePlayer,
  onArchive,
  formatDate,
  isArchived = false,
}: SessionCardProps) {
  const paidCount = session.players.filter(p => p.paid).length

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 mb-6 ${isArchived ? 'opacity-70' : ''}`}>
      {/* Session Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{formatDate(session.date)}</h3>
          <p className="text-sm text-gray-600">
            {session.players.length}/{session.max_players} Players | {paidCount} Paid
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Court Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Courts:</label>
            <select
              value={session.courts}
              onChange={(e) => onCourtChange(session.id, parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              disabled={isArchived}
            >
              <option value={2}>2 (14 max)</option>
              <option value={3}>3 (20 max)</option>
            </select>
          </div>
          {/* Archive Button */}
          <button
            onClick={() => onArchive(session.id, !isArchived)}
            className={`text-sm px-3 py-1 rounded ${
              isArchived
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Player List */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Players</h4>
        {session.players.length === 0 ? (
          <p className="text-gray-400 text-sm">No players signed up</p>
        ) : (
          <div className="space-y-2">
            {session.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-900">{player.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={player.paid}
                      onChange={() => onTogglePaid(player.id, player.paid)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className={`text-sm ${player.paid ? 'text-green-600' : 'text-gray-400'}`}>
                      Paid
                    </span>
                  </label>
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waitlist */}
      {session.waitlist.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Waitlist</h4>
          <div className="space-y-2">
            {session.waitlist.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                    W{index + 1}
                  </span>
                  <span className="text-gray-900">{player.name}</span>
                </div>
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
