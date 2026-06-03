import { useMemo, useState } from 'react'
import { computePlayerStats, fmt, profitClass } from '../lib/utils'
import Avatar from './Avatar'

function getMonthOptions(sessions) {
  const seen = new Set()
  const opts = []
  sessions.forEach((s) => {
    const m = s.date.slice(0, 7) // "YYYY-MM"
    if (!seen.has(m)) { seen.add(m); opts.push(m) }
  })
  return opts.sort((a, b) => b.localeCompare(a))
}

function labelMonth(ym) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export default function Leaderboard({ players, sessions }) {
  const [month, setMonth] = useState('all')

  const monthOptions = useMemo(() => getMonthOptions(sessions), [sessions])

  const filteredSessions = useMemo(
    () => month === 'all' ? sessions : sessions.filter((s) => s.date.startsWith(month)),
    [sessions, month]
  )

  const ranked = useMemo(
    () =>
      players
        .map((p) => ({ ...p, ...computePlayerStats(p.id, filteredSessions) }))
        .filter((p) => p.sessionsPlayed > 0 || month === 'all')
        .sort((a, b) => b.totalProfit - a.totalProfit),
    [players, filteredSessions, month]
  )

  if (players.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">🃏</div>
        <p className="text-lg">No players yet.</p>
        <p className="text-sm mt-1">Add players in the Admin panel to get started.</p>
      </div>
    )
  }

  const hasData = filteredSessions.length > 0 && ranked.length > 0
  const winner = ranked[0]
  const loser = ranked[ranked.length - 1]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-100">
            {month === 'all' ? 'All-Time Leaderboard' : labelMonth(month)}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredSessions.length} sessions · {players.length} players
          </p>
        </div>
        {monthOptions.length > 0 && (
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input bg-gray-800 text-sm py-1.5 px-3 w-auto"
          >
            <option value="all">All Time</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{labelMonth(m)}</option>
            ))}
          </select>
        )}
      </div>

      {hasData && ranked.length > 1 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 border-yellow-800/60 bg-gradient-to-br from-gray-900 to-yellow-950/40">
            <div className="text-3xl mb-2">🏆</div>
            <div className="flex items-center gap-2 mb-1">
              <Avatar player={winner} size="sm" />
              <p className="font-bold text-yellow-300 text-lg truncate">{winner.name}</p>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Biggest Winner</p>
            <p className="text-green-400 font-mono font-semibold mt-0.5">{fmt(winner.totalProfit)}</p>
          </div>
          <div className="card p-4 border-red-900/60 bg-gradient-to-br from-gray-900 to-red-950/40">
            <div className="text-3xl mb-2">💀</div>
            <div className="flex items-center gap-2 mb-1">
              <Avatar player={loser} size="sm" />
              <p className="font-bold text-red-300 text-lg truncate">{loser.name}</p>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Biggest Loser</p>
            <p className="text-red-400 font-mono font-semibold mt-0.5">{fmt(loser.totalProfit)}</p>
          </div>
        </div>
      )}

      {!hasData && month !== 'all' && (
        <div className="card p-8 text-center text-gray-500">
          <p>No sessions in {labelMonth(month)}.</p>
        </div>
      )}

      {ranked.length > 0 && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-800">
            {ranked.map((player, index) => {
              const isWinner = index === 0 && hasData && ranked.length > 1
              const isLoser = index === ranked.length - 1 && ranked.length > 1 && hasData
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 px-4 py-4 ${
                    isWinner ? 'bg-yellow-950/20' : isLoser ? 'bg-red-950/15' : ''
                  }`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {isWinner ? (
                      <span className="text-xl">🏆</span>
                    ) : isLoser ? (
                      <span className="text-xl">💀</span>
                    ) : (
                      <span className="text-gray-500 font-mono text-sm font-bold">#{index + 1}</span>
                    )}
                  </div>

                  <Avatar player={player} size="md" />

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${
                      isWinner ? 'text-yellow-300' : isLoser ? 'text-red-300' : 'text-gray-100'
                    }`}>
                      {player.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {player.sessionsPlayed} sessions
                      {player.sessionsPlayed > 0 && (
                        <> · avg <span className={profitClass(player.avgProfit)}>{fmt(player.avgProfit)}</span>/session</>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`font-mono font-bold text-xl ${profitClass(player.totalProfit)}`}>
                      {fmt(player.totalProfit)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
