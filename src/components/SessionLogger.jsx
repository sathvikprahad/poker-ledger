import { useState } from 'react'
import { supabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().split('T')[0]

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

  const getState = (id) =>
    playerData[id] || { active: false, buyin: '', cashout: '' }

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
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              required
            />
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
          <span className="text-sm font-normal text-gray-500">
            ({activePlayers.length} selected)
          </span>
        </h3>
        {players.length === 0 ? (
          <p className="text-gray-500 text-sm">No players added yet. Add some players first.</p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => {
              const state = getState(player.id)
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border transition-all ${
                    state.active
                      ? 'border-green-700/60 bg-green-950/25'
                      : 'border-gray-800 bg-gray-800/20'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => toggle(player.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        state.active
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {state.active && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-gray-100 select-none">{player.name}</span>
                  </div>

                  {state.active && (
                    <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                      <div>
                        <label className="label">Buy-in ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.buyin}
                          onChange={(e) => setField(player.id, 'buyin', e.target.value)}
                          className="input"
                          placeholder="100"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="label">Cash-out ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.cashout}
                          onChange={(e) => setField(player.id, 'cashout', e.target.value)}
                          className="input"
                          placeholder="150"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activePlayers.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Preview
          </p>
          <div className="space-y-1.5">
            {activePlayers.map((p) => {
              const s = getState(p.id)
              const buyin = Number(s.buyin) || 0
              const cashout = Number(s.cashout) || 0
              const profit = cashout - buyin
              return (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{p.name}</span>
                  <span
                    className={`font-mono font-semibold ${
                      profit > 0
                        ? 'text-green-400'
                        : profit < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || activePlayers.length === 0}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? 'Saving...' : '💾 Log Session'}
      </button>
    </form>
  )
}
