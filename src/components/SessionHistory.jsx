import { useMemo, useState } from 'react'
import { fmt, profitClass, formatDate, getProfit, computeSettlement, paymentMethod } from '../lib/utils'

export default function SessionHistory({ sessions }) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions]
  )
  const [expandedId, setExpandedId] = useState(null)

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
        const isExpanded = expandedId === session.id

        let potNote = null, txns = []
        if (isExpanded) {
          const players_with_net = results.map((r) => ({
            name: r.players?.name || 'Unknown',
            net: Math.round(getProfit(r) * 100) / 100,
          }))
          ;({ potNote, txns } = computeSettlement(players_with_net))
        }

        return (
          <div key={session.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              className="w-full text-left px-4 py-3 bg-gray-800/40 border-b border-gray-800 hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-100">{session.location}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{formatDate(session.date)}</p>
                </div>
                <div className="text-right text-sm text-gray-500 flex-shrink-0 flex items-start gap-2">
                  <div>
                    <p>{results.length} players</p>
                    <p className="font-mono">${totalPot.toFixed(0)} pot</p>
                  </div>
                  <svg
                    className={`w-4 h-4 mt-0.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 12 12" fill="none"
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {session.notes && (
                <p className="text-sm text-gray-400 italic mt-2 border-t border-gray-700 pt-2">
                  "{session.notes}"
                </p>
              )}
            </button>

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

            {isExpanded && (
              <div className="border-t border-gray-800 p-4 bg-gray-900/40">
                {txns.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Settlements</p>
                    <div className="space-y-2">
                      {txns.map((t, i) => (
                        <div key={i} className="text-sm text-gray-300">
                          <span className="text-red-400 font-medium">{t.from}</span>
                          {' owes '}
                          <span className="text-green-400 font-medium">{t.to}</span>
                          {' '}
                          <span className="font-mono font-semibold text-white">${t.amt.toFixed(2)}</span>
                          <span className="text-gray-500"> via {paymentMethod(t.from, t.to)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No settlements needed.</p>
                )}

                {potNote?.type === 'over' && (
                  <div className="mt-3 space-y-1">
                    {potNote.split.map((s) => {
                      const orig = results.find((r) => (r.players?.name || 'Unknown') === s.name)
                      const origNet = orig ? getProfit(orig) : 0
                      return (
                        <p key={s.name} className="text-xs text-yellow-400">
                          ⚡ {s.name} collects ${(origNet - s.deduct).toFixed(2)} (not ${origNet.toFixed(2)}, down ${s.deduct.toFixed(2)})
                        </p>
                      )
                    })}
                  </div>
                )}
                {potNote?.type === 'short' && (
                  <p className="mt-3 text-xs text-yellow-400">
                    ⚡ {potNote.winner} collects ${potNote.amt.toFixed(2)} less due to pot shortage
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
