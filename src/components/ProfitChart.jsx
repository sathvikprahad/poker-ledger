import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { buildChartData, fmt, getProfit, formatDateShort } from '../lib/utils'

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#ef4444',
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-2xl text-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {sorted.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span style={{ color: entry.color }}>●</span>
          <span className="text-gray-300">{entry.name}:</span>
          <span className={entry.value >= 0 ? 'text-green-400' : 'text-red-400'} style={{ fontFamily: 'monospace' }}>
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function buildSessionBar(sessions, players) {
  return [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const row = { label: formatDateShort(s.date) + ' · ' + s.location.slice(0, 12) }
      players.forEach((p) => {
        const r = s.session_results?.find((r) => r.player_id === p.id)
        row[p.id] = r ? getProfit(r) : null
      })
      return row
    })
}

function buildHeatmap(sessions) {
  const map = {}
  sessions.forEach((s) => {
    const loc = s.location || 'Unknown'
    if (!map[loc]) map[loc] = { location: loc, sessions: 0, totalSwing: 0, max: 0 }
    const profits = (s.session_results || []).map((r) => Math.abs(getProfit(r)))
    const swing = profits.reduce((a, b) => a + b, 0)
    map[loc].sessions++
    map[loc].totalSwing += swing
    map[loc].max = Math.max(map[loc].max, ...profits, 0)
  })
  return Object.values(map).sort((a, b) => b.totalSwing - a.totalSwing)
}

export default function ProfitChart({ players, sessions }) {
  const [tab, setTab] = useState('line')
  const [excludedIds, setExcludedIds] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  const visiblePlayers = useMemo(
    () => players.filter((p) => !excludedIds.has(p.id)),
    [players, excludedIds]
  )

  // Colors are keyed by position in the full (unfiltered) list, so toggling the
  // filter never reshuffles which color belongs to which remaining player.
  const colorMap = useMemo(() => {
    const m = new Map()
    players.forEach((p, i) => m.set(p.id, COLORS[i % COLORS.length]))
    return m
  }, [players])

  const togglePlayer = (id) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const lineData = useMemo(() => buildChartData(sessions, visiblePlayers), [sessions, visiblePlayers])
  const barData = useMemo(() => buildSessionBar(sessions, visiblePlayers), [sessions, visiblePlayers])
  const heatmap = useMemo(() => buildHeatmap(sessions), [sessions])

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">📈</div>
        <p>No sessions to chart yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-100">Charts</h2>
        <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1">
          {[['line', '📈 Cumulative'], ['bar', '📊 Per Session'], ['heat', '🌡️ Venues']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === id ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab !== 'heat' && (
        <div className="relative inline-block">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/60 text-sm text-gray-300 hover:border-gray-600"
          >
            👥 Players
            <span className="text-gray-500">{visiblePlayers.length}/{players.length}</span>
            <span className="text-gray-500">{filterOpen ? '▴' : '▾'}</span>
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute z-20 mt-2 w-56 max-h-80 overflow-y-auto card p-2 shadow-2xl">
                <div className="flex gap-2 px-1 pb-2 mb-1 border-b border-gray-800">
                  <button onClick={() => setExcludedIds(new Set())} className="text-xs text-green-400 hover:text-green-300">Select all</button>
                  <span className="text-gray-700">·</span>
                  <button onClick={() => setExcludedIds(new Set(players.map((p) => p.id)))} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
                </div>
                {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-800 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!excludedIds.has(p.id)}
                      onChange={() => togglePlayer(p.id)}
                      className="accent-green-600"
                    />
                    <span className="text-gray-200 truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'line' && (
        <div className="card p-4 sm:p-6">
          <div className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#374151' }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
                {visiblePlayers.map((player) => (
                  <Line key={player.id} type="monotone" dataKey={player.id} name={player.name}
                    stroke={colorMap.get(player.id)} strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 0, fill: colorMap.get(player.id) }}
                    activeDot={{ r: 6, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'bar' && (
        <div className="card p-4 sm:p-6">
          <p className="text-xs text-gray-500 mb-4">Each session — who won or lost the most in a single night</p>
          <div className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false}
                  axisLine={{ stroke: '#374151' }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                <ReferenceLine y={0} stroke="#374151" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
                {visiblePlayers.map((player) => (
                  <Bar key={player.id} dataKey={player.id} name={player.name} fill={colorMap.get(player.id)} radius={[3, 3, 0, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry[player.id] >= 0 ? colorMap.get(player.id) : colorMap.get(player.id) + '99'} />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'heat' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <p className="text-sm text-gray-400">Venue stats — which locations have the biggest swings</p>
          </div>
          <div className="divide-y divide-gray-800">
            {heatmap.map((row) => {
              const intensity = Math.min(row.totalSwing / 500, 1)
              return (
                <div key={row.location} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-2 h-10 rounded-full flex-shrink-0"
                    style={{ background: `rgba(239,68,68,${0.2 + intensity * 0.7})` }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100 truncate">{row.location}</p>
                    <p className="text-xs text-gray-500">{row.sessions} session{row.sessions !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm text-gray-300">{fmt(row.totalSwing)} total action</p>
                    <p className="text-xs text-gray-500">biggest pot: {fmt(row.max)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
