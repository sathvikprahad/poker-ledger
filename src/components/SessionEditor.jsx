import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, getProfit, fmt, profitClass } from '../lib/utils'

export default function SessionEditor({ players, sessions, onDataChange }) {
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)

  const toast = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleDelete = async (session) => {
    if (
      !confirm(
        `Delete the session at "${session.location}" on ${formatDate(session.date)}? This cannot be undone.`
      )
    )
      return
    const { error } = await supabase.from('sessions').delete().eq('id', session.id)
    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else {
      toast('Session deleted.')
      if (editing === session.id) setEditing(null)
      onDataChange()
    }
  }

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">🃏</div>
        <p>No sessions to edit yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      {sorted.map((session) => (
        <div key={session.id} className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 border-b border-gray-800">
            <div>
              <p className="font-semibold text-gray-100">{session.location}</p>
              <p className="text-sm text-gray-400">{formatDate(session.date)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setEditing(editing === session.id ? null : session.id)}
                className="text-sm px-3 py-1.5 rounded border border-gray-700 text-gray-400
                           hover:border-green-700 hover:text-green-400 transition-colors"
              >
                {editing === session.id ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => handleDelete(session)}
                className="text-sm px-3 py-1.5 rounded border border-red-900/60 text-red-500
                           hover:bg-red-900/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {editing !== session.id ? (
            <div className="divide-y divide-gray-800">
              {(session.session_results || []).map((result) => {
                const profit = getProfit(result)
                return (
                  <div
                    key={result.id}
                    className="flex justify-between items-center px-4 py-2.5 text-sm"
                  >
                    <span className="text-gray-300">{result.players?.name || 'Unknown'}</span>
                    <span className={`font-mono font-semibold ${profitClass(profit)}`}>
                      {fmt(profit)}
                    </span>
                  </div>
                )
              })}
              {(session.session_results || []).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No results recorded.</p>
              )}
            </div>
          ) : (
            <EditForm
              session={session}
              players={players}
              onSave={() => {
                setEditing(null)
                onDataChange()
              }}
              onMsg={toast}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function EditForm({ session, players, onSave, onMsg }) {
  const existingResults = session.session_results || []

  const initData = () => {
    const data = {}
    players.forEach((p) => {
      const existing = existingResults.find((r) => r.player_id === p.id)
      data[p.id] = {
        active: !!existing,
        buyin: existing ? String(existing.buyin) : '',
        cashout: existing ? String(existing.cashout) : '',
        resultId: existing?.id || null,
      }
    })
    return data
  }

  const [date, setDate] = useState(session.date)
  const [location, setLocation] = useState(session.location)
  const [notes, setNotes] = useState(session.notes || '')
  const [playerData, setPlayerData] = useState(initData)
  const [loading, setLoading] = useState(false)

  const getState = (id) =>
    playerData[id] || { active: false, buyin: '', cashout: '', resultId: null }

  const toggle = (id) =>
    setPlayerData((prev) => ({ ...prev, [id]: { ...getState(id), active: !getState(id).active } }))

  const setField = (id, field, val) =>
    setPlayerData((prev) => ({ ...prev, [id]: { ...getState(id), [field]: val } }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!date || !location.trim()) return onMsg('Date and location are required.', 'error')
    setLoading(true)

    const { error: se } = await supabase
      .from('sessions')
      .update({ date, location: location.trim(), notes: notes.trim() || null })
      .eq('id', session.id)

    if (se) {
      onMsg(`Error: ${se.message}`, 'error')
      setLoading(false)
      return
    }

    for (const player of players) {
      const state = getState(player.id)
      const existing = existingResults.find((r) => r.player_id === player.id)

      if (state.active) {
        const payload = {
          buyin: Number(state.buyin) || 0,
          cashout: Number(state.cashout) || 0,
        }
        if (existing) {
          await supabase.from('session_results').update(payload).eq('id', existing.id)
        } else {
          await supabase
            .from('session_results')
            .insert({ session_id: session.id, player_id: player.id, ...payload })
        }
      } else if (existing) {
        await supabase.from('session_results').delete().eq('id', existing.id)
      }
    }

    onMsg('Session updated!')
    onSave()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSave} className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input resize-none"
          rows={2}
        />
      </div>

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
                    state.active ? 'bg-green-600 border-green-600' : 'border-gray-600'
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
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving...' : '💾 Save Changes'}
      </button>
    </form>
  )
}
