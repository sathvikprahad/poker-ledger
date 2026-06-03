import { useState, useMemo } from 'react'
import { computePlayerStats, fmt, profitClass, formatDate, getProfit } from '../lib/utils'
import { computeAchievements } from '../lib/achievements'
import Avatar from './Avatar'

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
      <p className="text-sm text-gray-500 -mt-2">Click a player to see their session history</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {allStats.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelected(selected === player.id ? null : player.id)}
            className={`card p-4 text-left transition-all hover:border-gray-600 ${
              selected === player.id ? 'border-green-600 bg-green-950/20' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar player={player} size="md" />
              <p className="font-semibold text-gray-100 truncate">{player.name}</p>
            </div>
            <p className={`font-mono font-bold text-lg ${profitClass(player.totalProfit)}`}>
              {fmt(player.totalProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{player.sessionsPlayed} sessions</p>
          </button>
        ))}
      </div>

      {selectedStats && (
        <div className="card overflow-hidden">
          {/* Player header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Avatar player={selectedStats} size="lg" />
              <div>
                <h3 className="font-bold text-xl text-gray-100">{selectedStats.name}</h3>
                <StreakBadge streak={selectedStats.streak} />
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-sm">✕ Close</button>
          </div>

          {/* Achievements */}
          <AchievementBadges playerId={selectedStats.id} sessions={sessions} />

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 border-b border-gray-800">
            <StatCard label="Total P/L" value={fmt(selectedStats.totalProfit)} colorClass={profitClass(selectedStats.totalProfit)} />
            <StatCard label="Sessions" value={selectedStats.sessionsPlayed} />
            <StatCard label="Avg / Session" value={fmt(selectedStats.avgProfit)} colorClass={profitClass(selectedStats.avgProfit)} />
            <StatCard label="Best Session" value={fmt(selectedStats.bestSession)} colorClass="text-green-400" />
            <StatCard label="Worst Session" value={fmt(selectedStats.worstSession)} colorClass="text-red-400" />
          </div>

          {/* Session list */}
          <div className="p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Session History ({selectedSessions.length})
            </p>
            {selectedSessions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No sessions played yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedSessions.map((session) => {
                  const result = session.session_results?.find((r) => r.player_id === selected)
                  const profit = result ? getProfit(result) : 0
                  return (
                    <div key={session.id} className="bg-gray-800/50 rounded-lg p-4">
                      {/* Session header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-100">{session.location}</p>
                          <p className="text-xs text-gray-500">{formatDate(session.date)}</p>
                        </div>
                        <p className={`font-mono font-bold text-xl flex-shrink-0 ${profitClass(profit)}`}>
                          {fmt(profit)}
                        </p>
                      </div>

                      {/* Buy-in / cash-out */}
                      <p className="text-xs text-gray-500 mt-1">
                        ${Number(result?.buyin || 0).toFixed(0)} buy-in → ${Number(result?.cashout || 0).toFixed(0)} cash-out
                      </p>

                      {/* Hand details */}
                      {(result?.biggest_hand_won || result?.biggest_hand_lost) && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-1.5">
                          {result?.biggest_hand_won && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-400">🃏 Biggest win:</span>
                              <span className="text-green-400 font-mono font-semibold">
                                ${Number(result.biggest_hand_won).toFixed(2)}
                              </span>
                              {result.biggest_hand_won_from && (
                                <span className="text-gray-400">from {result.biggest_hand_won_from}</span>
                              )}
                            </div>
                          )}
                          {result?.biggest_hand_lost && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-red-400">💸 Biggest loss:</span>
                              <span className="text-red-400 font-mono font-semibold">
                                ${Number(result.biggest_hand_lost).toFixed(2)}
                              </span>
                              {result.biggest_hand_lost_to && (
                                <span className="text-gray-400">to {result.biggest_hand_lost_to}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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

function AchievementBadges({ playerId, sessions }) {
  const badges = useMemo(() => computeAchievements(playerId, sessions), [playerId, sessions])
  if (badges.length === 0) return null
  return (
    <div className="px-5 py-4 border-b border-gray-800">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Achievements</p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div key={b.name} title={b.desc}
            className="flex items-center gap-1.5 bg-gray-800/70 border border-gray-700/60 rounded-full px-3 py-1 text-sm">
            <span>{b.emoji}</span>
            <span className="text-gray-200 font-medium">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StreakBadge({ streak }) {
  if (streak === 0) return null
  const isWin = streak > 0
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      isWin ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
    }`}>
      {isWin ? `🔥 ${streak}W streak` : `❄️ ${Math.abs(streak)}L streak`}
    </span>
  )
}
