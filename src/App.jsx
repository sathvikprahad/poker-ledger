import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Leaderboard from './components/Leaderboard'
import PlayerStats from './components/PlayerStats'
import SessionHistory from './components/SessionHistory'
import ProfitChart from './components/ProfitChart'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import GTO from './components/GTO'

const PUBLIC_TABS = [
  { id: 'leaderboard', label: '🏆 Leaderboard' },
  { id: 'players', label: '👤 Players' },
  { id: 'sessions', label: '🃏 Sessions' },
  { id: 'chart', label: '📈 Chart' },
  { id: 'gto', label: '🎮 GTO' },
]

export default function App() {
  const [view, setView] = useState('public')
  const [tab, setTab] = useState('leaderboard')
  const [isAdmin, setIsAdmin] = useState(false)
  const [players, setPlayers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isFirstLoad = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const [{ data: pd, error: pe }, { data: sd, error: se }] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase
          .from('sessions')
          .select('*, session_results(*, players(id, name))')
          .order('date', { ascending: true }),
      ])
      if (pe) throw pe
      if (se) throw se
      setPlayers(pd || [])
      setSessions(sd || [])
      setError(null)
    } catch (err) {
      if (isFirstLoad.current) setError(err.message)
    } finally {
      isFirstLoad.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-4" style={{ animation: 'pulse 1.5s infinite' }}>♠</div>
          <p className="text-green-400 text-lg font-semibold tracking-wide">Shuffling cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-red-400 font-bold text-lg mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm mb-3 break-words">{error}</p>
          <p className="text-gray-500 text-xs mb-5">
            Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file
          </p>
          <button onClick={fetchData} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-gray-100">
      <Nav
        view={view}
        isAdmin={isAdmin}
        tab={tab}
        tabs={PUBLIC_TABS}
        onTabChange={setTab}
        onGoAdmin={() => setView('admin')}
        onGoPublic={() => setView('public')}
        onLogout={() => { setIsAdmin(false); setView('public') }}
      />

      {view === 'public' && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          {tab === 'leaderboard' && <Leaderboard players={players} sessions={sessions} />}
          {tab === 'players' && <PlayerStats players={players} sessions={sessions} />}
          {tab === 'sessions' && <SessionHistory sessions={sessions} />}
          {tab === 'chart' && <ProfitChart players={players} sessions={sessions} />}
          {tab === 'gto' && <GTO />}
        </main>
      )}

      {view === 'admin' && !isAdmin && (
        <AdminLogin onLogin={() => setIsAdmin(true)} onBack={() => setView('public')} />
      )}

      {view === 'admin' && isAdmin && (
        <AdminDashboard players={players} sessions={sessions} onDataChange={fetchData} />
      )}
    </div>
  )
}
