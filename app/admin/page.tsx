"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Session, Player } from "@/lib/supabase";

interface SessionWithPlayers extends Session {
  players: Player[];
  waitlist: Player[];
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionCourts, setNewSessionCourts] = useState(2);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      // Fetch all sessions
      const sessionsRes = await fetch("/api/sessions?includeArchived=true");
      if (!sessionsRes.ok) throw new Error("Failed to load sessions");
      const sessionsData: Session[] = await sessionsRes.json();

      // Fetch players for each session
      const sessionsWithPlayers = await Promise.all(
        sessionsData.map(async (session) => {
          const playersRes = await fetch(
            `/api/players?sessionId=${session.id}`
          );
          const playersData: Player[] = playersRes.ok
            ? await playersRes.json()
            : [];
          return {
            ...session,
            players: playersData.filter((p) => !p.is_waitlist),
            waitlist: playersData.filter((p) => p.is_waitlist),
          };
        })
      );

      setSessions(sessionsWithPlayers);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "admin" }),
    });
    router.push("/admin/auth");
  };

  const handleCourtChange = async (sessionId: string, courts: number) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, courts }),
      });

      if (!res.ok) throw new Error("Failed to update");
      await fetchData();
    } catch {
      setError("Failed to update courts");
    }
  };

  const handleCostChange = async (sessionId: string, cost: number) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, cost }),
      });

      if (!res.ok) throw new Error("Failed to update");
      await fetchData();
    } catch {
      setError("Failed to update cost");
    }
  };

  const handleTogglePaid = async (playerId: string, currentPaid: boolean) => {
    try {
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playerId, paid: !currentPaid }),
      });

      if (!res.ok) throw new Error("Failed to update");
      await fetchData();
    } catch {
      setError("Failed to update payment status");
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to remove this player?")) return;

    try {
      const res = await fetch(`/api/players?playerId=${playerId}&admin=true`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove");
      await fetchData();
    } catch {
      setError("Failed to remove player");
    }
  };

  const handleAddPlayer = async (sessionId: string, name: string) => {
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name, admin: true }),
      });

      if (!res.ok) throw new Error("Failed to add player");
      await fetchData();
    } catch {
      setError("Failed to add player");
    }
  };

  const handlePromotePlayer = async (playerId: string) => {
    try {
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playerId, promote: true }),
      });

      if (!res.ok) throw new Error("Failed to promote player");
      await fetchData();
    } catch {
      setError("Failed to promote player");
    }
  };

  const handleArchiveSession = async (sessionId: string, archived: boolean) => {
    const message = archived
      ? "Are you sure you want to archive this session?"
      : "Are you sure you want to unarchive this session?";
    if (!confirm(message)) return;

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, archived }),
      });

      if (!res.ok) throw new Error("Failed to update");
      await fetchData();
    } catch {
      setError("Failed to archive session");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this session? This cannot be undone."
      )
    )
      return;

    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");
      await fetchData();
    } catch {
      setError("Failed to delete session");
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionDate) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newSessionDate,
          courts: newSessionCourts,
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");
      setNewSessionDate("");
      setNewSessionCourts(2);
      await fetchData();
    } catch {
      setError("Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center court-bg">
        <div className="text-2xl text-emerald-200 flex items-center gap-3">
          <span className="animate-spin text-4xl">🏸</span>
          Loading...
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = sessions
    .filter((s) => !s.archived && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSessions = sessions
    .filter((s) => !s.archived && s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const archivedSessions = sessions
    .filter((s) => s.archived)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="min-h-screen court-bg p-4 relative">
      {/* Decorative shuttlecocks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div
          className="animate-shuttle-fly absolute top-20 text-4xl"
          style={{ animationDelay: "-3s" }}
        >
          🏸
        </div>
        <div
          className="animate-shuttle-fly absolute top-60 text-3xl"
          style={{ animationDelay: "-6s" }}
        >
          🏸
        </div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <a
            href="/signup"
            className="flex items-center gap-2 text-emerald-200 hover:text-yellow-400 transition-colors"
          >
            <span className="text-2xl">🏸</span>
            <span className="font-semibold">Monday Badminton</span>
          </a>
          <nav className="flex items-center gap-4">
            <a
              href="/signup"
              className="text-sm text-emerald-200 hover:text-yellow-400 transition-colors"
            >
              Sign Up
            </a>
            <span className="text-emerald-200/30">|</span>
            <span className="text-sm text-yellow-400 font-medium">Admin</span>
            <span className="text-emerald-200/30">|</span>
            <button
              onClick={handleLogout}
              className="text-sm text-emerald-200 hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>

        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🛡️</span>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 mb-6 animate-wiggle">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Create Session Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>➕</span> Create New Session
          </h3>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-emerald-200 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-emerald-400/30 rounded-xl text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-emerald-200 mb-1">
                  Courts
                </label>
                <select
                  value={newSessionCourts}
                  onChange={(e) =>
                    setNewSessionCourts(parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 bg-white/10 border border-emerald-400/30 rounded-xl text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                >
                  <option value={2} className="bg-emerald-900">
                    2 Courts (14 max)
                  </option>
                  <option value={3} className="bg-emerald-900">
                    3 Courts (20 max)
                  </option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating || !newSessionDate}
              className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-xl font-bold hover:from-yellow-300 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🏸</span> Creating...
                </span>
              ) : (
                "Create Session"
              )}
            </button>
          </form>
        </div>

        {/* Active Sessions */}
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>📅</span> Active Sessions
        </h2>
        {upcomingSessions.length === 0 ? (
          <p className="text-emerald-200/60 mb-8 bg-white/5 rounded-xl p-4 text-center">
            No active sessions
          </p>
        ) : (
          upcomingSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onCourtChange={handleCourtChange}
              onCostChange={handleCostChange}
              onTogglePaid={handleTogglePaid}
              onRemovePlayer={handleRemovePlayer}
              onAddPlayer={handleAddPlayer}
              onPromotePlayer={handlePromotePlayer}
              onArchive={handleArchiveSession}
              formatDate={formatDate}
            />
          ))
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-white mb-4 mt-8 flex items-center gap-2">
              <span>⏰</span> Past Sessions
            </h2>
            {pastSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onCourtChange={handleCourtChange}
                onCostChange={handleCostChange}
                onTogglePaid={handleTogglePaid}
                onRemovePlayer={handleRemovePlayer}
                onAddPlayer={handleAddPlayer}
                onPromotePlayer={handlePromotePlayer}
                onArchive={handleArchiveSession}
                onDelete={handleDeleteSession}
                formatDate={formatDate}
              />
            ))}
          </>
        )}

        {/* Archived Sessions */}
        {archivedSessions.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-white mb-4 mt-8 flex items-center gap-2">
              <span>📦</span> Archived Sessions
            </h2>
            {archivedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onCourtChange={handleCourtChange}
                onCostChange={handleCostChange}
                onTogglePaid={handleTogglePaid}
                onRemovePlayer={handleRemovePlayer}
                onAddPlayer={handleAddPlayer}
                onPromotePlayer={handlePromotePlayer}
                onArchive={handleArchiveSession}
                onDelete={handleDeleteSession}
                formatDate={formatDate}
                isArchived
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

interface SessionCardProps {
  session: SessionWithPlayers;
  onCourtChange: (id: string, courts: number) => void;
  onCostChange: (id: string, cost: number) => void;
  onTogglePaid: (playerId: string, currentPaid: boolean) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (sessionId: string, name: string) => void;
  onPromotePlayer: (playerId: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  formatDate: (dateStr: string) => string;
  isArchived?: boolean;
}

function SessionCard({
  session,
  onCourtChange,
  onCostChange,
  onTogglePaid,
  onRemovePlayer,
  onAddPlayer,
  onPromotePlayer,
  onArchive,
  onDelete,
  formatDate,
  isArchived = false,
}: SessionCardProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [costValue, setCostValue] = useState(
    session.cost ? String(session.cost) : ""
  );
  const [editingCourts, setEditingCourts] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const playerCount = session.players.length;
  const costPerPlayer =
    playerCount > 0 && session.cost ? session.cost / playerCount : 0;

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setAddingPlayer(true);
    await onAddPlayer(session.id, newPlayerName.trim());
    setNewPlayerName("");
    setAddingPlayer(false);
  };

  const handleCostBlur = () => {
    onCostChange(session.id, parseFloat(costValue) || 0);
    setEditingCost(false);
  };

  return (
    <div
      className={`bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/20 transition-all relative ${
        isArchived ? "opacity-60" : ""
      }`}
    >
      {/* Three-dot Menu */}
      <div ref={menuRef} className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer text-emerald-200 hover:text-white"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-emerald-900 border border-white/20 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => {
                onArchive(session.id, !isArchived);
                setMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2 text-emerald-200"
            >
              {isArchived ? "📤 Unarchive" : "📦 Archive"}
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(session.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-2 text-red-400"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Session Header */}
      <div className="mb-4 pr-10">
        {/* Date */}
        <h3 className="text-lg font-semibold text-white mb-1">
          {formatDate(session.date)}
        </h3>

        {/* Stats */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-emerald-200 mb-3">
          <span>
            👥 {session.players.length}/{session.max_players} Players
          </span>
          {costPerPlayer > 0 && (
            <span className="text-emerald-300">
              ${costPerPlayer.toFixed(2)}/person
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-2">
          {/* Court Selector */}
          {editingCourts && !isArchived ? (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 ring-2 ring-yellow-400">
              <label className="text-sm text-emerald-200">Courts:</label>
              <select
                value={session.courts}
                onChange={(e) => {
                  onCourtChange(session.id, parseInt(e.target.value));
                  setEditingCourts(false);
                }}
                onBlur={() => setEditingCourts(false)}
                className="bg-transparent border-none text-white text-sm focus:ring-0 focus:outline-none p-0"
                autoFocus
              >
                <option value={2} className="bg-emerald-900">
                  2
                </option>
                <option value={3} className="bg-emerald-900">
                  3
                </option>
              </select>
            </div>
          ) : (
            <button
              onClick={() => !isArchived && setEditingCourts(true)}
              className={`flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-left ${
                !isArchived ? "hover:bg-white/10 cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="text-sm text-emerald-200">Courts:</span>
              <span className="text-sm text-white">{session.courts}</span>
            </button>
          )}

          {/* Cost Input */}
          {editingCost && !isArchived ? (
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-3 py-2 ring-2 ring-yellow-400">
              <label className="text-sm text-emerald-200">Total: $</label>
              <input
                type="text"
                inputMode="decimal"
                value={costValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setCostValue(val);
                  }
                }}
                onBlur={handleCostBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCostBlur();
                }}
                placeholder="0"
                className="w-14 bg-transparent border-none text-white text-sm text-right focus:ring-0 focus:outline-none p-0"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => !isArchived && setEditingCost(true)}
              className={`flex items-center gap-1 bg-white/5 rounded-lg px-3 py-2 text-left ${
                !isArchived ? "hover:bg-white/10 cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="text-sm text-emerald-200">Total:</span>
              <span className="text-sm text-white">
                ${session.cost ? session.cost.toFixed(2) : "0"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Player List */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-emerald-200 mb-2">
          🏆 Players
        </h4>
        {session.players.length === 0 ? (
          <p className="text-emerald-200/40 text-sm">No players signed up</p>
        ) : (
          <div className="space-y-2">
            {session.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-yellow-400 text-gray-900"
                        : index === 1
                        ? "bg-gray-300 text-gray-900"
                        : index === 2
                        ? "bg-orange-400 text-gray-900"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={player.paid}
                      onChange={() => onTogglePaid(player.id, player.paid)}
                      className="w-4 h-4 text-green-500 bg-white/10 border-white/20 rounded"
                    />
                    <span
                      className={`text-sm ${
                        player.paid ? "text-green-400" : "text-yellow-400"
                      }`}
                    >
                      {player.paid
                        ? "Paid"
                        : costPerPlayer > 0
                        ? `$${costPerPlayer.toFixed(2)}`
                        : "Unpaid"}
                    </span>
                  </label>
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Player Form */}
        {!isArchived && (
          <form onSubmit={handleAddPlayer} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Add player..."
              className="flex-1 px-3 py-2 bg-white/10 border border-emerald-400/30 rounded-lg text-white placeholder-emerald-200/50 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
            />
            <button
              type="submit"
              disabled={addingPlayer || !newPlayerName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-lg font-medium text-sm hover:from-yellow-300 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {addingPlayer ? "..." : "+ Add"}
            </button>
          </form>
        )}
      </div>

      {/* Waitlist */}
      {session.waitlist.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-emerald-200 mb-2">
            ⏳ Waitlist
          </h4>
          <div className="space-y-2">
            {session.waitlist.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 bg-orange-500/10 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    W{index + 1}
                  </span>
                  <span className="text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isArchived && (
                    <button
                      onClick={() => onPromotePlayer(player.id)}
                      className="text-green-400 hover:text-green-300 text-sm transition-colors"
                    >
                      Promote
                    </button>
                  )}
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
