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
  const lineData = useMemo(() => buildChartData(sessions, players), [sessions, players])
  const barData = useMemo(() => buildSessionBar(sessions, players), [sessions, players])
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
                {players.map((player, i) => (
                  <Line key={player.id} type="monotone" dataKey={player.id} name={player.name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
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
                {players.map((player, i) => (
                  <Bar key={player.id} dataKey={player.id} name={player.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry[player.id] >= 0 ? COLORS[i % COLORS.length] : COLORS[i % COLORS.length] + '99'} />
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
