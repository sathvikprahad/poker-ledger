import { useState } from 'react'

// Change this to whatever password you want
const ADMIN_PASSWORD = 'poker'

export default function AdminLogin({ onLogin, onBack }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      onLogin()
    } else {
      setError('Wrong password.')
      setPassword('')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div
        className={`card p-8 w-full max-w-sm transition-transform ${
          shake ? 'animate-[shake_0.3s_ease]' : ''
        }`}
        style={shake ? { animation: 'shake 0.3s ease' } : {}}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-100">Admin Panel</h2>
          <p className="text-sm text-gray-400 mt-1">Enter the admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="input"
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mt-1.5">{error}</p>}
          </div>
          <button type="submit" className="btn-primary w-full py-2.5">
            Enter
          </button>
        </form>

        <button onClick={onBack} className="btn-ghost w-full mt-3 text-sm">
          ← Back to Leaderboard
        </button>
      </div>
    </div>
  )
}
