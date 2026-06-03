import { getProfit } from './utils'

function getResults(playerId, sessions) {
  return [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, session) => {
      const r = session.session_results?.find((r) => r.player_id === playerId)
      if (r) acc.push({ date: session.date, profit: getProfit(r), buyin: Number(r.buyin) })
      return acc
    }, [])
}

export function computeAchievements(playerId, sessions) {
  const results = getResults(playerId, sessions)
  if (results.length === 0) return []

  const profits = results.map((r) => r.profit)
  const wins = profits.filter((p) => p > 0).length
  const losses = profits.filter((p) => p < 0).length
  const total = profits.reduce((s, p) => s + p, 0)
  const maxWin = Math.max(...profits)

  let streak = 0
  const lastIsWin = profits[profits.length - 1] > 0
  for (let i = profits.length - 1; i >= 0; i--) {
    if ((profits[i] > 0) === lastIsWin) streak += lastIsWin ? 1 : -1
    else break
  }

  const badges = []

  if (profits[0] > 0)
    badges.push({ emoji: '🩸', name: 'First Blood', desc: 'Won their very first session' })

  if (results.find((r) => r.buyin > 0 && r.profit >= r.buyin))
    badges.push({ emoji: '🦋', name: 'Comeback Kid', desc: 'Doubled their buy-in in one session' })

  if (results.length >= 3 && losses > wins)
    badges.push({ emoji: '🎁', name: 'Donator', desc: `${losses} losses vs ${wins} wins — the group thanks you` })

  if (streak >= 3)
    badges.push({ emoji: '🔥', name: 'On Fire', desc: `${streak} session win streak` })

  if (streak <= -3)
    badges.push({ emoji: '🥶', name: 'Ice Cold', desc: `${Math.abs(streak)} session losing streak` })

  if (maxWin >= 100)
    badges.push({ emoji: '🐳', name: 'Whale', desc: `Won $${maxWin.toFixed(0)} in a single session` })

  if (results.length >= 5)
    badges.push({ emoji: '⚙️', name: 'Grinder', desc: `${results.length} sessions played` })

  if (total > 100)
    badges.push({ emoji: '💰', name: 'Certified Winner', desc: `Up $${total.toFixed(0)} overall` })

  if (total < -50)
    badges.push({ emoji: '📉', name: 'In the Red', desc: `Down $${Math.abs(total).toFixed(0)} overall` })

  return badges
}
