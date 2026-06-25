import { useState } from 'react'
import { supabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().split('T')[0]

const DEFAULT_PLAYER_STATE = {
  active: false,
  buyin: '',
  cashout: '',
  biggest_hand_won: '',
  biggest_hand_won_from: '',
  biggest_hand_lost: '',
  biggest_hand_lost_to: '',
}

export default function SessionLogger({ players, onDataChange }) {
  const [date, setDate] = useState(todayStr())
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [playerData, setPlayerData] = useState({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const toast = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const getState = (id) => playerData[id] || { ...DEFAULT_PLAYER_STATE }

  const toggle = (id) =>
    setPlayerData((prev) => ({
      ...prev,
      [id]: { ...getState(id), active: !getState(id).active },
    }))

  const setField = (id, field, val) =>
    setPlayerData((prev) => ({
      ...prev,
      [id]: { ...getState(id), [field]: val },
    }))

  const activePlayers = players.filter((p) => getState(p.id).active)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date || !location.trim()) return toast('Date and location are required.', 'error')
    if (activePlayers.length === 0) return toast('Select at least one player.', 'error')

    const missing = activePlayers.find((p) => {
      const s = getState(p.id)
      return s.buyin === '' || s.cashout === ''
    })
    if (missing) return toast(`Enter buy-in and cash-out for ${missing.name}.`, 'error')

    setLoading(true)

    const { data: session, error: se } = await supabase
      .from('sessions')
      .insert({ date, location: location.trim(), notes: notes.trim() || null })
      .select()
      .single()

    if (se) {
      toast(`Error: ${se.message}`, 'error')
      setLoading(false)
      return
    }

    const results = activePlayers.map((p) => {
      const s = getState(p.id)
      return {
        session_id: session.id,
        player_id: p.id,
        buyin: Number(s.buyin),
        cashout: Number(s.cashout),
        biggest_hand_won: s.biggest_hand_won ? Number(s.biggest_hand_won) : null,
        biggest_hand_won_from: s.biggest_hand_won_from || null,
        biggest_hand_lost: s.biggest_hand_lost ? Number(s.biggest_hand_lost) : null,
        biggest_hand_lost_to: s.biggest_hand_lost_to || null,
      }
    })

    const { error: re } = await supabase.from('session_results').insert(results)

    if (re) {
      await supabase.from('sessions').delete().eq('id', session.id)
      toast(`Error saving results: ${re.message}`, 'error')
    } else {
      toast('Session logged! 🎉')
      setDate(todayStr())
      setLocation('')
      setNotes('')
      setPlayerData({})
      onDataChange()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {msg && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            msg.type === 'error'
              ? 'bg-red-900/40 text-red-300 border border-red-800/50'
              : 'bg-green-900/40 text-green-300 border border-green-800/50'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-200">Session Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input"
              placeholder="e.g. John's place"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input resize-none"
            rows={2}
            placeholder="Any notes about the session..."
          />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-200 mb-4">
          Who played?{' '}
          <span className="text-sm font-normal text-gray-500">({activePlayers.length} selected)</span>
        </h3>
        {players.length === 0 ? (
          <p className="text-gray-500 text-sm">No players added yet.</p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => {
              const state = getState(player.id)
              const otherPlayers = players.filter((p) => p.id !== player.id)
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border transition-all ${
                    state.active ? 'border-green-700/60 bg-green-950/25' : 'border-gray-800 bg-gray-800/20'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggle(player.id)}>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        state.active ? 'bg-green-600 border-green-600' : 'border-gray-600'
                      }`}
                    >
                      {state.active && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-gray-100 select-none">{player.name}</span>
                  </div>

                  {state.active && (
                    <div className="px-3 pb-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {/* Buy-in / Cash-out */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Buy-in ($)</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={state.buyin}
                            onChange={(e) => setField(player.id, 'buyin', e.target.value)}
                            className="input" placeholder="100"
                          />
                        </div>
                        <div>
                          <label className="label">Cash-out ($)</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={state.cashout}
                            onChange={(e) => setField(player.id, 'cashout', e.target.value)}
                            className="input" placeholder="150"
                          />
                        </div>
                      </div>

                      {/* Hand details */}
                      <div className="border-t border-gray-700/50 pt-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                          Hand Details <span className="font-normal text-gray-600">(optional)</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Biggest hand won ($)</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={state.biggest_hand_won}
                              onChange={(e) => setField(player.id, 'biggest_hand_won', e.target.value)}
                              className="input" placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="label">Won from</label>
                            <select
                              value={state.biggest_hand_won_from}
                              onChange={(e) => setField(player.id, 'biggest_hand_won_from', e.target.value)}
                              className="input bg-gray-800"
                            >
                              <option value="">— select —</option>
                              {otherPlayers.map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Biggest hand lost ($)</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={state.biggest_hand_lost}
                              onChange={(e) => setField(player.id, 'biggest_hand_lost', e.target.value)}
                              className="input" placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="label">Lost to</label>
                            <select
                              value={state.biggest_hand_lost_to}
                              onChange={(e) => setField(player.id, 'biggest_hand_lost_to', e.target.value)}
                              className="input bg-gray-800"
                            >
                              <option value="">— select —</option>
                              {otherPlayers.map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activePlayers.length > 0 && (() => {
        const ZELLE_APPLE = new Set(['Dudy'])
        const APPLE_ONLY  = new Set(['Drinu', 'Pranav'])

        function paymentMethod(payer, receiver) {
          if (ZELLE_APPLE.has(payer) || ZELLE_APPLE.has(receiver)) return 'Zelle/Apple Cash'
          if (APPLE_ONLY.has(payer)  || APPLE_ONLY.has(receiver))  return 'Apple Cash'
          return 'Venmo'
        }

        const players_with_net = activePlayers.map((p) => {
          const s = getState(p.id)
          return { name: p.name, net: Math.round(((Number(s.cashout) || 0) - (Number(s.buyin) || 0)) * 100) / 100 }
        })

        const total = Math.round(players_with_net.reduce((s, p) => s + p.net, 0) * 100) / 100
        const winners = [...players_with_net].filter(p => p.net > 0).sort((a, b) => b.net - a.net)

        let adjustments = {}, potNote = null
        if (total < 0) {
          potNote = { type: 'short', amt: Math.abs(total), winner: winners[0]?.name }
        } else if (total > 0) {
          potNote = { type: 'over', amt: total }
          const gap = winners.length >= 2 ? winners[0].net - winners[1].net : Infinity
          if (gap >= 25 || winners.length === 1) {
            adjustments[winners[0].name] = total
            potNote.split = [{ name: winners[0].name, deduct: total }]
          } else {
            const deductions = {}
            winners.forEach(w => { deductions[w.name] = 0 })
            // Top winner absorbs up to $1 first
            const topTake = Math.min(1, Math.round(total * 100) / 100)
            deductions[winners[0].name] = topTake
            let remaining = Math.round((total - topTake) * 100) / 100
            // Remaining split evenly among other winners (each capped at $1)
            if (remaining > 0 && winners.length > 1) {
              const others = winners.slice(1)
              const each = Math.round((remaining / others.length) * 100) / 100
              others.forEach(w => { deductions[w.name] = each })
            }
            winners.forEach(w => { if (deductions[w.name] > 0) adjustments[w.name] = deductions[w.name] })
            potNote.split = winners.filter(w => deductions[w.name] > 0).map(w => ({ name: w.name, deduct: deductions[w.name] }))
          }
        }

        const bal = players_with_net.map(p => ({ name: p.name, b: Math.round((p.net - (adjustments[p.name] || 0)) * 100) / 100 }))
        const txns = []
        for (let i = 0; i < 50; i++) {
          const creds = bal.filter(p => p.b > 0.005).sort((a, b) => b.b - a.b)
          const debts = bal.filter(p => p.b < -0.005).sort((a, b) => a.b - b.b)
          if (!creds.length || !debts.length) break
          const c = creds[0], d = debts[0]
          const amt = Math.round(Math.min(c.b, -d.b) * 100) / 100
          txns.push({ from: d.name, to: c.name, amt })
          c.b = Math.round((c.b - amt) * 100) / 100
          d.b = Math.round((d.b + amt) * 100) / 100
        }

        return (
          <div className="card p-4 space-y-4">
            {/* Profits / Losses */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
              <div className="space-y-1.5">
                {players_with_net.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-gray-300">{p.name}</span>
                    <span className={`font-mono font-semibold ${p.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.net >= 0 ? '+' : ''}${p.net.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pot status */}
              <div className={`mt-3 pt-3 border-t border-gray-700 text-sm font-semibold text-center ${
                !potNote ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {!potNote
                  ? 'Profits and Losses are correct'
                  : potNote.type === 'short'
                    ? `Pot off by -$${potNote.amt.toFixed(2)} — no adjustment needed`
                    : `Pot off by +$${potNote.amt.toFixed(2)}`}
              </div>
            </div>

            {/* Settlements */}
            {txns.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
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

                {/* Pot adjustment notes */}
                {potNote?.type === 'over' && (
                  <div className="mt-3 space-y-1">
                    {potNote.split.map(s => {
                      const orig = players_with_net.find(p => p.name === s.name).net
                      return (
                        <p key={s.name} className="text-xs text-yellow-400">
                          ⚡ {s.name} collects ${(orig - s.deduct).toFixed(2)} (not ${orig.toFixed(2)}, down ${s.deduct.toFixed(2)})
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
      })()}

      <button type="submit" disabled={loading || activePlayers.length === 0} className="btn-primary w-full py-3 text-base">
        {loading ? 'Saving...' : '💾 Log Session'}
      </button>
    </form>
  )
}
