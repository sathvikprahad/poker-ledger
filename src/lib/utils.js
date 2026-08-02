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

const ZELLE_APPLE = new Set(['Dudy'])
const APPLE_ONLY = new Set(['Drinu', 'Pranav'])

export const paymentMethod = (payer, receiver) => {
  if (ZELLE_APPLE.has(payer) || ZELLE_APPLE.has(receiver)) return 'Zelle/Apple Cash'
  if (APPLE_ONLY.has(payer) || APPLE_ONLY.has(receiver)) return 'Apple Cash'
  return 'Venmo'
}

// playersWithNet: [{ name, net }] — net = cashout - buyin
export const computeSettlement = (playersWithNet) => {
  const total = Math.round(playersWithNet.reduce((s, p) => s + p.net, 0) * 100) / 100
  const winners = [...playersWithNet].filter((p) => p.net > 0).sort((a, b) => b.net - a.net)

  let adjustments = {}, potNote = null
  if (total < 0) {
    potNote = { type: 'short', amt: Math.abs(total), winner: winners[0]?.name }
  } else if (total > 0) {
    potNote = { type: 'over', amt: total }
    const gap = winners.length >= 2 ? winners[0].net - winners[1].net : Infinity
    if (gap >= 25 || winners.length === 1) {
      adjustments[winners[0].name] = total
      potNote.split = [{ name: winners[0].name, deduct: total }]
    } else {
      const deductions = {}
      winners.forEach((w) => { deductions[w.name] = 0 })
      // Top winner absorbs up to $1 first
      const topTake = Math.min(1, Math.round(total * 100) / 100)
      deductions[winners[0].name] = topTake
      let remaining = Math.round((total - topTake) * 100) / 100
      // Remaining split evenly among other winners
      if (remaining > 0 && winners.length > 1) {
        const others = winners.slice(1)
        const each = Math.round((remaining / others.length) * 100) / 100
        others.forEach((w) => { deductions[w.name] = each })
      }
      winners.forEach((w) => { if (deductions[w.name] > 0) adjustments[w.name] = deductions[w.name] })
      potNote.split = winners.filter((w) => deductions[w.name] > 0).map((w) => ({ name: w.name, deduct: deductions[w.name] }))
    }
  }

  const bal = playersWithNet.map((p) => ({ name: p.name, b: Math.round((p.net - (adjustments[p.name] || 0)) * 100) / 100 }))
  const txns = []
  for (let i = 0; i < 50; i++) {
    const creds = bal.filter((p) => p.b > 0.005).sort((a, b) => b.b - a.b)
    const debts = bal.filter((p) => p.b < -0.005).sort((a, b) => a.b - b.b)
    if (!creds.length || !debts.length) break
    const c = creds[0], d = debts[0]
    const amt = Math.round(Math.min(c.b, -d.b) * 100) / 100
    txns.push({ from: d.name, to: c.name, amt })
    c.b = Math.round((c.b - amt) * 100) / 100
    d.b = Math.round((d.b + amt) * 100) / 100
  }

  return { total, potNote, txns }
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
