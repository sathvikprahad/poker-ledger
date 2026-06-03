import { useMemo } from 'react'
import { fmt, profitClass, formatDate, getProfit } from '../lib/utils'

export default function SessionHistory({ sessions }) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions]
  )

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">🃏</div>
        <p>No sessions logged yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-100">Session History</h2>

      {sorted.map((session) => {
        const results = [...(session.session_results || [])].sort(
          (a, b) => getProfit(b) - getProfit(a)
        )
        const totalPot = results.reduce((s, r) => s + Number(r.buyin), 0)

        return (
          <div key={session.id} className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/40 border-b border-gray-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-100">{session.location}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{formatDate(session.date)}</p>
                </div>
                <div className="text-right text-sm text-gray-500 flex-shrink-0">
                  <p>{results.length} players</p>
                  <p className="font-mono">${totalPot.toFixed(0)} pot</p>
                </div>
              </div>
              {session.notes && (
                <p className="text-sm text-gray-400 italic mt-2 border-t border-gray-700 pt-2">
                  "{session.notes}"
                </p>
              )}
            </div>

            <div className="divide-y divide-gray-800">
              {results.map((result) => {
                const profit = getProfit(result)
                return (
                  <div key={result.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-100">
                        {result.players?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ${Number(result.buyin).toFixed(0)} in · ${Number(result.cashout).toFixed(0)} out
                      </p>
                    </div>
                    <p className={`font-mono font-bold text-lg ${profitClass(profit)}`}>
                      {fmt(profit)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
