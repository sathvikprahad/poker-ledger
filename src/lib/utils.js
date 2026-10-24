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

export const CORE_MEMBERS = new Set(['Arjun', 'Robin', 'Sathvik', 'Shirish', 'Drinu', 'Dishi', 'Dudy', 'Roshan', 'Rohan'])

// A session counts as "core" only if every player in it is a core member —
// one outside player anywhere in the session excludes the whole session.
export const isCoreSession = (session) =>
  (session.session_results || []).every((r) => CORE_MEMBERS.has(r.players?.name))

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
  // Anyone whose final share is under $1 can't get their own Venmo/Apple Cash request —
  // their payment has to be merged into someone else's. Recorded before the loop mutates `bal`.
  const subDollarPlayers = bal.filter((p) => Math.abs(p.b) > 0.005 && Math.abs(p.b) < 1).map((p) => ({ name: p.name, net: p.b, amt: Math.abs(p.b) }))

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

  const finalTxns = avoidSubDollarPayments(txns)
  const subDollarNotes = subDollarPlayers.map((p) => {
    const related = finalTxns.find((t) => t.from === p.name || t.to === p.name)
    return {
      ...p,
      // merged: true if we found another payment to reroute through (related.group is set).
      // false means nobody else's payment touches this person, so a sub-$1 transaction
      // to them couldn't be avoided — related.amt will still be under $1.
      merged: !!related?.group,
      group: related?.group ?? null,
    }
  })

  return { total, potNote, txns: finalTxns, subDollarNotes }
}

// Reroutes any payment under $1 through another payment that shares its payer or
// recipient, so nobody ever has to send or request less than $1 on Venmo/Apple Cash.
// Preserves everyone's exact total paid/received — only the path money takes changes.
// Example: A owes C $3, B owes C $0.20 -> rerouted to A owes B $3, B owes C $3.20.
// Every transaction touched by a reroute (including chains of them) shares a `group`
// id, so the UI can visually link which payments belong to the same reroute.
const avoidSubDollarPayments = (txns, minAmt = 1) => {
  const eps = 0.005
  let groupCounter = 0
  for (let guard = 0; guard < txns.length * 2; guard++) {
    const small = txns.find((t) => t.amt < minAmt - eps)
    if (!small) break

    const sameCreditor = txns.find((t) => t !== small && t.to === small.to && t.from !== small.from && t.amt >= minAmt - eps)
    const relay = sameCreditor || txns.find((t) => t !== small && t.from === small.from && t.to !== small.to && t.amt >= minAmt - eps)
    if (!relay) break // no payment to relay through — this person's own net is under $1, unavoidable

    const group = small.group || relay.group || `reroute-${groupCounter++}`
    small.group = group
    relay.group = group

    if (sameCreditor) relay.to = small.from
    else relay.from = small.to
    small.amt = Math.round((small.amt + relay.amt) * 100) / 100
  }
  return txns.filter((t) => t.amt > eps)
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
