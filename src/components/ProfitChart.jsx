import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { buildChartData, fmt } from '../lib/utils'

const COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#14b8a6',
  '#ef4444',
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
          <span
            className={entry.value >= 0 ? 'text-green-400' : 'text-red-400'}
            style={{ fontFamily: 'monospace' }}
          >
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ProfitChart({ players, sessions }) {
  const data = useMemo(() => buildChartData(sessions, players), [sessions, players])

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
      <h2 className="text-xl font-bold text-gray-100">Cumulative Profit Over Time</h2>

      <div className="card p-4 sm:p-6">
        <div className="h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={55}
              />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
                )}
              />
              {players.map((player, i) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={player.id}
                  name={player.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
