import { useState } from 'react'
import { createDeck, shuffle, calculateEquity, evaluate7, SUIT_SYMBOLS } from '../lib/poker'

// ── Constants ──────────────────────────────────────────────────────────────────

const HAND_LIMIT = 20
const STACK_BB = 100

const POSITIONS_BY_N = {
  2: ['SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'],
}

// ── Persistence ────────────────────────────────────────────────────────────────

function todayKey() {
  return `gto_practice_${new Date().toISOString().slice(0, 10)}`
}

function getHandsToday() {
  return parseInt(localStorage.getItem(todayKey()) || '0')
}

function recordHand() {
  localStorage.setItem(todayKey(), String(getHandsToday() + 1))
}

// ── Poker helpers ──────────────────────────────────────────────────────────────

function cmpScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? -1, bi = b[i] ?? -1
    if (ai > bi) return 1
    if (ai < bi) return -1
  }
  return 0
}

function getWinner(playerHand, cpuHands, cpuFolded, community) {
  const pScore = evaluate7([...playerHand, ...community])
  let bestScore = null, bestIdx = -1
  cpuHands.forEach((h, i) => {
    if (cpuFolded[i]) return
    const s = evaluate7([...h, ...community])
    if (!bestScore || cmpScores(s, bestScore) > 0) { bestScore = s; bestIdx = i }
  })
  if (!bestScore) return { winner: 'player', cpuIdx: -1 }
  return { winner: cmpScores(pScore, bestScore) >= 0 ? 'player' : 'cpu', cpuIdx: bestIdx }
}

function calcEV(playerHand, cpuHands, cpuFolded, community, pot, toCall, bb) {
  const activeHands = [playerHand, ...cpuHands.filter((_, i) => !cpuFolded[i])]
  if (activeHands.length < 2) return null
  try {
    const results = calculateEquity(activeHands, community, 500)
    const eq = results[0].equity / 100
    const raiseAmt = Math.round(Math.max(toCall * 2.5, bb * 3))
    return {
      equity: eq,
      evFold: 0,
      evCall: toCall > 0 ? eq * (pot + toCall) - toCall : null,
      evCheck: toCall === 0 ? eq * pot : null,
      evRaise: eq * (pot + raiseAmt) - raiseAmt,
      raiseAmt,
      toCall,
    }
  } catch { return null }
}

function decideCpu(cpuHand, playerHand, otherActive, community, pot, toCall) {
  try {
    const allHands = [cpuHand, playerHand, ...otherActive]
    const results = calculateEquity(allHands, community, 200)
    const eq = results[0].equity / 100
    if (toCall === 0) {
      if (eq > 0.62) return { type: 'bet', amt: Math.round(pot * 0.65) }
      if (eq > 0.52 && Math.random() < 0.3) return { type: 'bet', amt: Math.round(pot * 0.4) }
      return { type: 'check' }
    }
    const odds = toCall / (pot + toCall)
    if (eq > odds + 0.25 && eq > 0.62) return { type: 'raise', amt: Math.round(toCall * 2.5) }
    if (eq >= odds || Math.random() < 0.1) return { type: 'call' }
    return { type: 'fold' }
  } catch { return { type: 'fold' } }
}

// ── Card UI ────────────────────────────────────────────────────────────────────

function CardFace({ card, lg }) {
  const rank = card[0]
  const suit = SUIT_SYMBOLS[card[1]]
  const red = card[1] === 'h' || card[1] === 'd'
  return (
    <div className={`${lg ? 'w-14 h-20' : 'w-10 h-14'} bg-white rounded-lg border border-gray-200 shadow-md flex flex-col items-center justify-center flex-shrink-0`}>
      <span className={`font-bold leading-none ${lg ? 'text-xl' : 'text-sm'} ${red ? 'text-red-600' : 'text-gray-900'}`}>{rank}</span>
      <span className={`leading-none ${lg ? 'text-lg' : 'text-xs'} ${red ? 'text-red-600' : 'text-gray-900'}`}>{suit}</span>
    </div>
  )
}

function CardBack({ lg, folded }) {
  return (
    <div className={`${lg ? 'w-14 h-20' : 'w-10 h-14'} rounded-lg shadow-md flex-shrink-0 ${
      folded ? 'bg-gray-700/30 border border-dashed border-gray-700/30' :
               'bg-gradient-to-br from-blue-700 to-blue-900 border border-blue-600'
    }`} />
  )
}

function CardSlot() {
  return <div className="w-10 h-14 rounded-lg border border-dashed border-gray-700/40 flex-shrink-0" />
}

// ── EV Panel ───────────────────────────────────────────────────────────────────

function EVPanel({ ev, computing }) {
  if (computing) return (
    <div className="card p-3 text-center text-gray-500 text-xs animate-pulse">
      Calculating equity...
    </div>
  )
  if (!ev) return null

  const { equity, evFold, evCall, evCheck, evRaise, raiseAmt, toCall } = ev

  function evColor(v) {
    if (v > 3) return 'text-green-400'
    if (v > 0) return 'text-green-300'
    if (v === 0) return 'text-gray-500'
    return 'text-red-400'
  }

  function fmt(v) {
    return `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(1)}`
  }

  const cells = [
    { label: 'Fold', value: evFold },
    evCheck !== null ? { label: 'Check', value: evCheck } : null,
    evCall !== null ? { label: `Call $${toCall}`, value: evCall } : null,
    { label: `Raise $${raiseAmt}`, value: evRaise },
  ].filter(Boolean)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Expected Value</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Equity:</span>
          <span className={`text-sm font-bold font-mono ${equity >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
            {(equity * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
        {cells.map(({ label, value }) => (
          <div key={label} className="bg-gray-800/60 rounded-lg p-2.5 text-center">
            <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
            <p className={`font-mono font-bold text-sm ${evColor(value)}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Config Screen ──────────────────────────────────────────────────────────────

function ConfigScreen({ cfg, setCfg, onStart, handsToday }) {
  const positions = POSITIONS_BY_N[cfg.n] || POSITIONS_BY_N[4]
  const limitReached = handsToday >= HAND_LIMIT

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div>
        <h3 className="font-bold text-gray-100 mb-0.5">Configure Your Table</h3>
        <p className="text-xs text-gray-500">Set stakes and position, then deal to start</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Players at table</label>
          <select className="input" value={cfg.n}
            onChange={e => {
              const n = +e.target.value
              const pos = POSITIONS_BY_N[n] || POSITIONS_BY_N[4]
              setCfg(c => ({ ...c, n, position: pos[Math.floor(pos.length / 2)] }))
            }}>
            {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} players</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Small blind ($)</label>
            <input type="number" min="0.25" step="0.25" className="input" value={cfg.sb}
              onChange={e => setCfg(c => ({ ...c, sb: +e.target.value }))} />
          </div>
          <div>
            <label className="label">Big blind ($)</label>
            <input type="number" min="0.5" step="0.5" className="input" value={cfg.bb}
              onChange={e => setCfg(c => ({ ...c, bb: +e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="label">Your position</label>
          <select className="input" value={cfg.position}
            onChange={e => setCfg(c => ({ ...c, position: e.target.value }))}>
            {positions.map(p => (
              <option key={p} value={p}>
                {p}{p === 'BTN' ? ' (Button)' : p === 'SB' ? ' (Small Blind)' : p === 'BB' ? ' (Big Blind)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">Daily hands: {handsToday} / {HAND_LIMIT}</span>
            {!limitReached && <span className="text-green-400">{HAND_LIMIT - handsToday} remaining</span>}
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full"
              style={{ width: `${Math.min(100, (handsToday / HAND_LIMIT) * 100)}%` }} />
          </div>
        </div>

        {limitReached ? (
          <div className="text-center py-2">
            <p className="text-yellow-400 font-semibold">Daily limit reached</p>
            <p className="text-gray-500 text-xs mt-1">Come back tomorrow for more hands.</p>
          </div>
        ) : (
          <button onClick={onStart} className="btn-primary w-full">
            Deal Cards 🃏
          </button>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center">
        EV is shown against actual dealt hands — perfect for learning hand strength in context.
        Limit tracked per browser.
      </p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GTOPractice() {
  const [handsToday, setHandsToday] = useState(getHandsToday)
  const [cfg, setCfg] = useState({ n: 4, sb: 1, bb: 2, position: 'BTN' })
  const [game, setGame] = useState(null)
  const [ev, setEv] = useState(null)
  const [evLoading, setEvLoading] = useState(false)
  const [log, setLog] = useState([])

  function refreshEV(g) {
    setEvLoading(true)
    setEv(null)
    setTimeout(() => {
      setEv(calcEV(g.playerHand, g.cpuHands, g.cpuFolded, g.community, g.pot, g.toCall, g.bb))
      setEvLoading(false)
    }, 20)
  }

  function startHand() {
    if (handsToday >= HAND_LIMIT) return
    const { n, sb, bb, position } = cfg
    const positions = POSITIONS_BY_N[n] || POSITIONS_BY_N[4]
    const pIdx = positions.indexOf(position)

    const deck = shuffle(createDeck())
    let di = 0
    const allHands = Array.from({ length: n }, () => [deck[di++], deck[di++]])
    const playerHand = allHands[pIdx]
    const cpuHands = allHands.filter((_, i) => i !== pIdx)
    const deckRest = deck.slice(di)

    const sbI = positions.indexOf('SB'), bbI = positions.indexOf('BB')
    let playerStreetBet = 0
    if (pIdx === sbI) playerStreetBet = sb
    else if (pIdx === bbI) playerStreetBet = bb

    const pot = sb + bb
    const toCall = Math.max(0, bb - playerStreetBet)

    const g = {
      street: 'preflop', phase: 'player_turn',
      deck: deckRest, positions, playerHand, cpuHands,
      community: [], pot,
      playerStack: bb * STACK_BB - playerStreetBet,
      cpuFolded: Array(n - 1).fill(false),
      playerFolded: false,
      toCall, currentBet: bb, playerStreetBet,
      bb, sb, playerPos: position, winner: null, winAmount: 0,
    }
    setGame(g)
    setLog([{ msg: `New hand · ${position} · Pot: $${pot} (SB $${sb} / BB $${bb})`, type: 'header' }])
    refreshEV(g)
  }

  function act(type, raiseAmt) {
    if (!game || game.phase === 'hand_over') return

    let g = { ...game, cpuFolded: [...game.cpuFolded] }
    const entries = []

    // Player action
    if (type === 'fold') {
      g.winner = 'cpu'; g.phase = 'hand_over'
      entries.push({ msg: 'You fold.', type: 'player' })
      entries.push({ msg: 'Hand over — CPUs win.', type: 'result' })
      setGame(g); setLog(l => [...l, ...entries]); setEv(null)
      recordHand(); setHandsToday(t => t + 1)
      return
    }
    if (type === 'call') {
      g.pot += g.toCall; g.playerStack -= g.toCall; g.playerStreetBet += g.toCall
      entries.push({ msg: `You call $${g.toCall}. Pot: $${g.pot}`, type: 'player' })
    } else if (type === 'check') {
      entries.push({ msg: 'You check.', type: 'player' })
    } else if (type === 'raise') {
      const cost = raiseAmt - g.playerStreetBet
      g.pot += cost; g.playerStack -= cost
      g.playerStreetBet = raiseAmt; g.currentBet = raiseAmt
      entries.push({ msg: `You raise to $${raiseAmt}. Pot: $${g.pot}`, type: 'player' })
    }

    // CPU actions
    let cpuRaisedAmt = 0
    const activeIdxs = g.cpuHands.map((_, i) => i).filter(i => !g.cpuFolded[i])
    for (const i of activeIdxs) {
      const otherActive = g.cpuHands.filter((_, j) => j !== i && !g.cpuFolded[j])
      const cpuToCall = type === 'raise' ? raiseAmt : 0
      const dec = decideCpu(g.cpuHands[i], g.playerHand, otherActive, g.community, g.pot, cpuToCall)
      const name = `CPU ${i + 1}`

      if (dec.type === 'fold') {
        g.cpuFolded[i] = true
        entries.push({ msg: `${name} folds.`, type: 'cpu_fold' })
      } else if (dec.type === 'call') {
        g.pot += cpuToCall
        entries.push({ msg: `${name} calls${cpuToCall > 0 ? ` $${cpuToCall}` : ''}. Pot: $${g.pot}`, type: 'cpu' })
      } else if (dec.type === 'check') {
        entries.push({ msg: `${name} checks.`, type: 'cpu' })
      } else if (dec.type === 'bet' || dec.type === 'raise') {
        const amt = dec.amt || g.bb * 3
        g.pot += amt; cpuRaisedAmt = Math.max(cpuRaisedAmt, amt)
        entries.push({ msg: `${name} ${dec.type}s $${amt}. Pot: $${g.pot}`, type: 'cpu_raise' })
      }
    }

    const stillActive = g.cpuHands.filter((_, i) => !g.cpuFolded[i]).length
    if (stillActive === 0) {
      g.winner = 'player'; g.winAmount = g.pot; g.phase = 'hand_over'
      entries.push({ msg: `All CPUs folded! You win $${g.pot}! 🎉`, type: 'result_win' })
      setGame(g); setLog(l => [...l, ...entries]); setEv(null)
      recordHand(); setHandsToday(t => t + 1)
      return
    }

    if (cpuRaisedAmt > 0) {
      g.toCall = cpuRaisedAmt; g.phase = 'player_react'
      entries.push({ msg: `CPU raised — call $${cpuRaisedAmt} or fold.`, type: 'header' })
      setGame(g); setLog(l => [...l, ...entries])
      refreshEV(g)
      return
    }

    advanceStreet(g, entries, stillActive)
  }

  function react(type) {
    if (!game) return
    let g = { ...game, cpuFolded: [...game.cpuFolded] }
    const entries = []

    if (type === 'fold') {
      g.winner = 'cpu'; g.phase = 'hand_over'
      entries.push({ msg: 'You fold to the raise.', type: 'player' })
      entries.push({ msg: 'Hand over — CPUs win.', type: 'result' })
      setGame(g); setLog(l => [...l, ...entries]); setEv(null)
      recordHand(); setHandsToday(t => t + 1)
      return
    }

    g.pot += g.toCall; g.playerStack -= g.toCall
    entries.push({ msg: `You call $${g.toCall}. Pot: $${g.pot}`, type: 'player' })
    const stillActive = g.cpuHands.filter((_, i) => !g.cpuFolded[i]).length
    advanceStreet(g, entries, stillActive)
  }

  function advanceStreet(g, entries, stillActive) {
    let ng = { ...g, currentBet: 0, playerStreetBet: 0, toCall: 0, phase: 'player_turn' }

    function cardLabel(c) { return c[0] + SUIT_SYMBOLS[c[1]] }

    if (g.street === 'preflop') {
      ng.community = g.deck.slice(0, 3)
      ng.street = 'flop'
      entries.push({ msg: `— FLOP: ${ng.community.map(cardLabel).join('  ')} —`, type: 'street' })
    } else if (g.street === 'flop') {
      ng.community = [...g.community, g.deck[3]]
      ng.street = 'turn'
      entries.push({ msg: `— TURN: ${cardLabel(g.deck[3])} —`, type: 'street' })
    } else if (g.street === 'turn') {
      ng.community = [...g.community, g.deck[4]]
      ng.street = 'river'
      entries.push({ msg: `— RIVER: ${cardLabel(g.deck[4])} —`, type: 'street' })
    } else {
      // Showdown
      const { winner, cpuIdx } = getWinner(g.playerHand, g.cpuHands, g.cpuFolded, g.community)
      ng.winner = winner; ng.winAmount = g.pot; ng.phase = 'hand_over'
      entries.push({ msg: '— SHOWDOWN —', type: 'street' })
      entries.push({
        msg: winner === 'player' ? `You win $${g.pot}! 🎉` : `CPU ${cpuIdx + 1} wins $${g.pot}.`,
        type: winner === 'player' ? 'result_win' : 'result',
      })
      setGame(ng); setLog(l => [...l, ...entries]); setEv(null)
      recordHand(); setHandsToday(t => t + 1)
      return
    }

    setGame(ng)
    setLog(l => [...l, ...entries])
    refreshEV(ng)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!game) {
    return <ConfigScreen cfg={cfg} setCfg={setCfg} onStart={startHand} handsToday={handsToday} />
  }

  const { playerHand, cpuHands, cpuFolded, community, pot, playerStack, street, phase, winner, winAmount, toCall, bb } = game
  const isOver = phase === 'hand_over'
  const isReact = phase === 'player_react'

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{street}</span>
          <span className="text-yellow-400 font-bold font-mono">Pot: ${pot}</span>
        </div>

        {/* CPU hands */}
        <div className="flex justify-center gap-5 mb-5 flex-wrap">
          {cpuHands.map((hand, i) => (
            <div key={i} className={`text-center transition-opacity ${cpuFolded[i] ? 'opacity-30' : ''}`}>
              <p className="text-xs text-gray-500 mb-1.5">CPU {i + 1}{cpuFolded[i] ? ' · folded' : ''}</p>
              <div className="flex gap-1 justify-center">
                {(isOver && !cpuFolded[i])
                  ? hand.map((c, ci) => <CardFace key={ci} card={c} />)
                  : hand.map((_, ci) => <CardBack key={ci} folded={cpuFolded[i]} />)
                }
              </div>
            </div>
          ))}
        </div>

        {/* Community */}
        <div className="flex gap-2 justify-center mb-5">
          {[0,1,2,3,4].map(i =>
            community[i] ? <CardFace key={i} card={community[i]} /> : <CardSlot key={i} />
          )}
        </div>

        {/* Player hand */}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1.5">
            Your hand ({game.playerPos}) · Stack: ${playerStack}
          </p>
          <div className="flex gap-2 justify-center">
            {playerHand.map((c, i) => <CardFace key={i} card={c} lg />)}
          </div>
        </div>
      </div>

      {/* EV */}
      <EVPanel ev={ev} computing={evLoading} />

      {/* Action buttons */}
      {!isOver && !evLoading && (
        <div className="flex gap-2">
          <button
            onClick={() => isReact ? react('fold') : act('fold')}
            className="flex-1 py-2.5 rounded border border-red-800/60 bg-red-950/20 text-red-400 font-medium text-sm hover:bg-red-950/40 transition-colors">
            Fold
          </button>

          {isReact ? (
            <button
              onClick={() => react('call')}
              className="flex-1 py-2.5 rounded border border-blue-800/60 bg-blue-950/20 text-blue-400 font-medium text-sm hover:bg-blue-950/40 transition-colors">
              Call ${toCall}
            </button>
          ) : (
            <>
              {toCall === 0 ? (
                <button
                  onClick={() => act('check')}
                  className="flex-1 py-2.5 rounded border border-gray-700 bg-gray-800/40 text-gray-300 font-medium text-sm hover:bg-gray-700/60 transition-colors">
                  Check
                </button>
              ) : (
                <button
                  onClick={() => act('call')}
                  className="flex-1 py-2.5 rounded border border-blue-800/60 bg-blue-950/20 text-blue-400 font-medium text-sm hover:bg-blue-950/40 transition-colors">
                  Call ${toCall}
                </button>
              )}
              <button
                onClick={() => act('raise', ev?.raiseAmt ?? bb * 3)}
                className="flex-1 py-2.5 rounded border border-green-800/60 bg-green-950/20 text-green-400 font-medium text-sm hover:bg-green-950/40 transition-colors">
                Raise ${ev?.raiseAmt ?? bb * 3}
              </button>
            </>
          )}
        </div>
      )}

      {/* Result */}
      {isOver && (
        <div className={`card p-4 text-center border-2 ${winner === 'player' ? 'border-green-700 bg-green-950/10' : 'border-red-800 bg-red-950/10'}`}>
          <p className={`text-xl font-bold mb-1 ${winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
            {winner === 'player' ? `You win $${winAmount}! 🎉` : `CPUs win $${winAmount}`}
          </p>
          <p className="text-gray-600 text-xs mb-3">{HAND_LIMIT - handsToday} hands remaining today</p>
          {handsToday < HAND_LIMIT ? (
            <button onClick={() => { setGame(null); setEv(null) }} className="btn-primary">
              Next Hand
            </button>
          ) : (
            <p className="text-yellow-400 text-sm font-semibold mt-1">Daily limit reached — come back tomorrow!</p>
          )}
        </div>
      )}

      {/* Action log */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Action Log</p>
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {log.map((e, i) => (
            <p key={i} className={`text-sm leading-relaxed ${
              e.type === 'header' ? 'text-yellow-400 font-medium' :
              e.type === 'street' ? 'text-blue-400 font-semibold pt-1' :
              e.type === 'player' ? 'text-green-400' :
              e.type === 'cpu_fold' ? 'text-gray-600' :
              e.type === 'cpu_raise' ? 'text-orange-400' :
              e.type === 'result_win' ? 'text-green-300 font-bold' :
              e.type === 'result' ? 'text-red-400' :
              'text-gray-400'
            }`}>{e.msg}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
