import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'

export default function PlayerManager({ players, onDataChange }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputRefs = useRef({})

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

  const handlePhotoChange = async (player, file) => {
    if (!file) return
    setUploadingId(player.id)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${player.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast(`Upload failed: ${uploadError.message}`, 'error')
      setUploadingId(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('players')
      .update({ avatar_url: publicUrl })
      .eq('id', player.id)

    if (updateError) {
      toast(`Error saving photo: ${updateError.message}`, 'error')
    } else {
      toast(`${player.name}'s photo updated!`)
      onDataChange()
    }
    setUploadingId(null)
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
              <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                {/* Hidden file input — opens camera roll on mobile */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => (fileInputRefs.current[player.id] = el)}
                  onChange={(e) => handlePhotoChange(player, e.target.files[0])}
                />

                {/* Clicking the avatar opens the file picker */}
                <button
                  onClick={() => fileInputRefs.current[player.id]?.click()}
                  disabled={uploadingId === player.id}
                  className="relative flex-shrink-0 group"
                  title="Change photo"
                >
                  <Avatar player={player} size="md" />
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
                                  opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">
                    {uploadingId === player.id ? '...' : '📷'}
                  </div>
                </button>

                <span className="text-gray-100 font-medium flex-1">{player.name}</span>

                {uploadingId === player.id && (
                  <span className="text-xs text-gray-400">Uploading...</span>
                )}

                <button
                  onClick={() => removePlayer(player)}
                  className="text-sm text-red-500 hover:text-red-400 px-2 py-1 rounded
                             hover:bg-red-900/30 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600 text-center py-2">Tap an avatar to change photo</p>
      </div>
    </div>
  )
}
