import { useState } from 'react'
import PlayerManager from './PlayerManager'
import SessionLogger from './SessionLogger'
import SessionEditor from './SessionEditor'

const TABS = [
  { id: 'players', label: '👥 Players' },
  { id: 'log', label: '➕ Log Session' },
  { id: 'edit', label: '✏️ Edit Sessions' },
]

export default function AdminDashboard({ players, sessions, onDataChange }) {
  const [tab, setTab] = useState('players')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🛠️</span>
        <h2 className="text-xl font-bold text-gray-100">Admin Dashboard</h2>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-2 rounded text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-green-800 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <PlayerManager players={players} onDataChange={onDataChange} />
      )}
      {tab === 'log' && (
        <SessionLogger players={players} onDataChange={onDataChange} />
      )}
      {tab === 'edit' && (
        <SessionEditor players={players} sessions={sessions} onDataChange={onDataChange} />
      )}
    </div>
  )
}
