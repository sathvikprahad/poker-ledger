import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'

export default function PlayerManager({ players, onDataChange }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [editingAvatar, setEditingAvatar] = useState(null) // player id
  const [avatarUrl, setAvatarUrl] = useState('')

  const toast = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3500)
  }

  const addPlayer = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    const { error } = await supabase.from('players').insert({ name: trimmed })
    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else {
      toast(`${trimmed} added!`)
      setName('')
      onDataChange()
    }
    setLoading(false)
  }

  const removePlayer = async (player) => {
    if (
      !confirm(
        `Remove ${player.name}? This will also delete all their session results. This cannot be undone.`
      )
    )
      return
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else {
      toast(`${player.name} removed.`)
      onDataChange()
    }
  }

  const startEditAvatar = (player) => {
    setEditingAvatar(player.id)
    setAvatarUrl(player.avatar_url || '')
  }

  const saveAvatar = async (player) => {
    const { error } = await supabase
      .from('players')
      .update({ avatar_url: avatarUrl.trim() || null })
      .eq('id', player.id)
    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else {
      toast('Photo updated!')
      setEditingAvatar(null)
      onDataChange()
    }
  }

  return (
    <div className="space-y-5">
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

      <div className="card p-5">
        <h3 className="font-semibold text-gray-200 mb-4">Add Player</h3>
        <form onSubmit={addPlayer} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Player name"
            maxLength={50}
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary whitespace-nowrap"
          >
            Add
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-200">Players</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {players.length}
          </span>
        </div>
        {players.length === 0 ? (
          <p className="text-gray-500 text-center py-10 text-sm">No players added yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {players.map((player) => (
              <div key={player.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar player={player} size="md" />
                  <span className="text-gray-100 font-medium flex-1">{player.name}</span>
                  <button
                    onClick={() =>
                      editingAvatar === player.id
                        ? setEditingAvatar(null)
                        : startEditAvatar(player)
                    }
                    className="text-sm text-gray-400 hover:text-green-400 px-2 py-1 rounded
                               hover:bg-gray-800 transition-colors"
                  >
                    {editingAvatar === player.id ? 'Cancel' : '📷 Photo'}
                  </button>
                  <button
                    onClick={() => removePlayer(player)}
                    className="text-sm text-red-500 hover:text-red-400 px-2 py-1 rounded
                               hover:bg-red-900/30 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {editingAvatar === player.id && (
                  <div className="flex gap-2 pl-12">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="input text-sm"
                      placeholder="Paste image URL (e.g. from Twitter/Instagram)"
                      autoFocus
                    />
                    <button
                      onClick={() => saveAvatar(player)}
                      className="btn-primary whitespace-nowrap text-sm"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
