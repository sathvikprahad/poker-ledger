import { useState, useMemo } from 'react'
import { computePlayerStats, fmt, profitClass, formatDate, getProfit } from '../lib/utils'

export default function PlayerStats({ players, sessions }) {
  const [selected, setSelected] = useState(null)

  const allStats = useMemo(
    () => players.map((p) => ({ ...p, ...computePlayerStats(p.id, sessions) })),
    [players, sessions]
  )

  if (players.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">👤</div>
        <p>No players yet.</p>
      </div>
    )
  }

  const selectedStats = allStats.find((s) => s.id === selected)
  const selectedSessions = selected
    ? [...sessions]
        .filter((s) => s.session_results?.some((r) => r.player_id === selected))
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-100">Player Stats</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {allStats.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelected(selected === player.id ? null : player.id)}
            className={`card p-4 text-left transition-all hover:border-gray-600 ${
              selected === player.id ? 'border-green-600 bg-green-950/20' : ''
            }`}
          >
            <p className="font-semibold text-gray-100 truncate">{player.name}</p>
            <p className={`font-mono font-bold text-lg mt-1 ${profitClass(player.totalProfit)}`}>
              {fmt(player.totalProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{player.sessionsPlayed} sessions</p>
          </button>
        ))}
      </div>

      {selectedStats && (
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-xl text-gray-100">{selectedStats.name}</h3>
            <StreakBadge streak={selectedStats.streak} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total P/L"
              value={fmt(selectedStats.totalProfit)}
              colorClass={profitClass(selectedStats.totalProfit)}
            />
            <StatCard label="Sessions Played" value={selectedStats.sessionsPlayed} />
            <StatCard
              label="Avg / Session"
              value={fmt(selectedStats.avgProfit)}
              colorClass={profitClass(selectedStats.avgProfit)}
            />
            <StatCard
              label="Best Session"
              value={fmt(selectedStats.bestSession)}
              colorClass="text-green-400"
            />
            <StatCard
              label="Worst Session"
              value={fmt(selectedStats.worstSession)}
              colorClass="text-red-400"
            />
          </div>

          {selectedSessions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Session History
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedSessions.map((session) => {
                  const result = session.session_results?.find((r) => r.player_id === selected)
                  const profit = result ? getProfit(result) : 0
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-200">{session.location}</p>
                        <p className="text-xs text-gray-500">{formatDate(session.date)}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`font-mono font-semibold ${profitClass(profit)}`}>
                          {fmt(profit)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${Number(result?.buyin || 0).toFixed(0)} in →{' '}
                          ${Number(result?.cashout || 0).toFixed(0)} out
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, colorClass = 'text-gray-100' }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-mono font-bold text-lg ${colorClass}`}>{value}</p>
    </div>
  )
}

function StreakBadge({ streak }) {
  if (streak === 0) return null
  const isWin = streak > 0
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${
        isWin ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
      }`}
    >
      {isWin ? `🔥 ${streak}W streak` : `❄️ ${Math.abs(streak)}L streak`}
    </span>
  )
}
