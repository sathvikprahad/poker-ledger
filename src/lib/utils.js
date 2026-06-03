export const fmt = (n) => {
  const num = Number(n) || 0
  const abs = Math.abs(num).toFixed(2)
  return num >= 0 ? `+$${abs}` : `-$${abs}`
}

export const profitClass = (n) => {
  const num = Number(n) || 0
  return num > 0 ? 'text-green-400' : num < 0 ? 'text-red-400' : 'text-gray-400'
}

// Safely read profit — falls back to cashout - buyin if the generated column isn't returned
export const getProfit = (result) => {
  if (result.profit !== undefined && result.profit !== null) return Number(result.profit)
  return Number(result.cashout) - Number(result.buyin)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export const computePlayerStats = (playerId, sessions) => {
  const results = []
  for (const session of sessions) {
    const result = session.session_results?.find((r) => r.player_id === playerId)
    if (result) {
      results.push({
        sessionId: session.id,
        date: session.date,
        profit: getProfit(result),
        buyin: Number(result.buyin),
        cashout: Number(result.cashout),
      })
    }
  }
  results.sort((a, b) => a.date.localeCompare(b.date))

  const totalProfit = results.reduce((s, r) => s + r.profit, 0)
  const sessionsPlayed = results.length
  const avgProfit = sessionsPlayed > 0 ? totalProfit / sessionsPlayed : 0
  const bestSession = results.length > 0 ? Math.max(...results.map((r) => r.profit)) : 0
  const worstSession = results.length > 0 ? Math.min(...results.map((r) => r.profit)) : 0

  let streak = 0
  if (results.length > 0) {
    const lastIsWin = results[results.length - 1].profit > 0
    for (let i = results.length - 1; i >= 0; i--) {
      if ((results[i].profit > 0) === lastIsWin) {
        streak += lastIsWin ? 1 : -1
      } else {
        break
      }
    }
  }

  return { totalProfit, sessionsPlayed, avgProfit, bestSession, worstSession, streak }
}

export const buildChartData = (sessions, players) => {
  const cumulative = {}
  players.forEach((p) => { cumulative[p.id] = 0 })

  return sessions.map((session) => {
    session.session_results?.forEach((result) => {
      if (cumulative[result.player_id] !== undefined) {
        cumulative[result.player_id] += getProfit(result)
      }
    })
    const point = { label: formatDateShort(session.date) }
    players.forEach((p) => { point[p.id] = Number(cumulative[p.id].toFixed(2)) })
    return point
  })
}
