import { useState, useCallback } from 'react'
import {
  RANKS, SUITS, SUIT_SYMBOLS, HAND_NAMES,
  calculateEquity, evaluate7,
  GRID_RANKS, handStr, OPEN_RANGES, QUIZ_QUESTIONS,
} from '../lib/poker'

// ── Card picker ────────────────────────────────────────────────────────────────

function CardPicker({ value, onChange, usedCards = [] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-colors
          ${value
            ? 'border-green-600 bg-green-950/30 text-white'
            : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-500'}`}>
        {value ? (
          <span style={{ color: value[1] === 'h' || value[1] === 'd' ? '#f87171' : '#e5e7eb' }}>
            {value[0]}{SUIT_SYMBOLS[value[1]]}
          </span>
        ) : '+'}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-2xl w-64">
          {value && (
            <button onClick={() => { onChange(null); setOpen(false) }}
              className="w-full text-left text-xs text-red-400 px-2 py-1 mb-1 hover:bg-gray-800 rounded">
              ✕ Clear
            </button>
          )}
          {SUITS.split('').map((suit) => (
            <div key={suit} className="flex gap-1 mb-1">
              {RANKS.split('').reverse().map((rank) => {
                const card = rank + suit
                const used = usedCards.includes(card)
                return (
                  <button key={card} disabled={used} onClick={() => { onChange(card); setOpen(false) }}
                    style={{ color: suit === 'h' || suit === 'd' ? '#f87171' : '#e5e7eb' }}
                    className={`w-8 h-9 rounded text-xs font-bold transition-colors
                      ${used ? 'opacity-20 cursor-not-allowed bg-gray-800'
                             : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'}`}>
                    {rank}{SUIT_SYMBOLS[suit]}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Equity Calculator ──────────────────────────────────────────────────────────

const EMPTY_HAND = [null, null]

function EquityCalc() {
  const [hands, setHands] = useState([EMPTY_HAND, EMPTY_HAND])
  const [board, setBoard] = useState([null, null, null, null, null])
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const allCards = [...hands.flat(), ...board].filter(Boolean)

  const setHandCard = (hi, ci, card) => {
    setHands((prev) => prev.map((h, i) => i === hi ? h.map((c, j) => j === ci ? card : c) : h))
    setResults(null)
  }
  const setBoardCard = (ci, card) => {
    setBoard((prev) => prev.map((c, i) => i === ci ? card : c))
    setResults(null)
  }

  const addHand = () => setHands((h) => [...h, EMPTY_HAND])
  const removeHand = (i) => setHands((h) => h.filter((_, idx) => idx !== i))

  const run = useCallback(() => {
    setError(null)
    const validHands = hands.map((h) => h.filter(Boolean))
    if (validHands.some((h) => h.length !== 2)) {
      setError('Each hand needs exactly 2 cards.'); return
    }
    const validBoard = board.filter(Boolean)
    if (validBoard.length > 0 && validBoard.length < 3) {
      setError('Board must be empty or have at least 3 cards (flop).'); return
    }
    setRunning(true)
    setTimeout(() => {
      try {
        const res = calculateEquity(validHands, validBoard, 8000)
        setResults(res)
      } catch (e) {
        setError(e.message)
      }
      setRunning(false)
    }, 10)
  }, [hands, board])

  const reset = () => { setHands([EMPTY_HAND, EMPTY_HAND]); setBoard([null,null,null,null,null]); setResults(null); setError(null) }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-100 mb-1">Hole Cards</h3>
        <p className="text-xs text-gray-500 mb-4">Add 2–4 Texas Hold'em hands to compare equity</p>
        <div className="space-y-3">
          {hands.map((hand, hi) => (
            <div key={hi} className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400 w-16">Hand {hi + 1}</span>
              <div className="flex gap-2">
                {hand.map((card, ci) => (
                  <CardPicker key={ci} value={card}
                    onChange={(c) => setHandCard(hi, ci, c)}
                    usedCards={allCards.filter((x) => x !== card)} />
                ))}
              </div>
              {results && (
                <div className="flex-1 min-w-32">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${results[hi].equity.toFixed(1)}%` }} />
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-green-400 font-bold">{results[hi].equity.toFixed(1)}%</span> equity
                    {' · '}{results[hi].win.toFixed(1)}% win · {results[hi].tie.toFixed(1)}% tie
                  </p>
                </div>
              )}
              {hands.length > 2 && (
                <button onClick={() => removeHand(hi)} className="text-red-500 text-xs hover:text-red-400">✕</button>
              )}
            </div>
          ))}
        </div>
        {hands.length < 4 && (
          <button onClick={addHand} className="mt-3 text-xs text-green-400 hover:text-green-300">+ Add hand</button>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-100 mb-1">Board (optional)</h3>
        <p className="text-xs text-gray-500 mb-3">Flop / turn / river — leave blank for pre-flop equity</p>
        <div className="flex gap-2 flex-wrap">
          {board.map((card, ci) => (
            <CardPicker key={ci} value={card}
              onChange={(c) => setBoardCard(ci, c)}
              usedCards={allCards.filter((x) => x !== card)} />
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button onClick={run} disabled={running}
          className="btn-primary flex-1">
          {running ? 'Calculating...' : '⚡ Calculate Equity'}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded border border-gray-700 text-gray-400 hover:text-gray-200 text-sm">
          Reset
        </button>
      </div>
    </div>
  )
}

// ── Range Charts ───────────────────────────────────────────────────────────────

function RangeChart() {
  const [position, setPosition] = useState('BTN')
  const range = OPEN_RANGES[position]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-100 mb-1">GTO Preflop Opening Ranges</h3>
        <p className="text-xs text-gray-500 mb-4">
          Approximate GTO open-raise ranges for 6-max Texas Hold'em. Green = in range, gray = fold.
        </p>
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.keys(OPEN_RANGES).map((pos) => (
            <button key={pos} onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                position === pos ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <td className="w-8 h-8" />
              {GRID_RANKS.map((r) => (
                <td key={r} className="w-10 h-8 text-center text-xs text-gray-500 font-semibold">{r}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRID_RANKS.map((r1, ri) => (
              <tr key={r1}>
                <td className="w-8 text-center text-xs text-gray-500 font-semibold pr-1">{r1}</td>
                {GRID_RANKS.map((r2, ci) => {
                  const suited = ci > ri
                  const pair = ri === ci
                  const hand = pair ? r1 + r2 : handStr(r1, r2, suited)
                  const inRange = range.has(hand)
                  return (
                    <td key={r2} title={hand}
                      className={`w-10 h-10 border border-gray-900 text-center cursor-default select-none transition-colors
                        ${inRange
                          ? 'bg-green-700/70 text-green-200'
                          : 'bg-gray-800/40 text-gray-600'}`}>
                      <span className="text-xs font-medium leading-none">{hand}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600">
        Top-right = suited hands · Bottom-left = offsuit hands · Diagonal = pairs
      </p>
    </div>
  )
}

// ── Hand Quiz ──────────────────────────────────────────────────────────────────

function HandQuiz() {
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = QUIZ_QUESTIONS[qIdx]
  const answered = selected !== null

  const pick = (i) => {
    if (answered) return
    setSelected(i)
    if (i === q.answer) setScore((s) => s + 1)
  }

  const next = () => {
    if (qIdx + 1 >= QUIZ_QUESTIONS.length) {
      setDone(true)
    } else {
      setQIdx((i) => i + 1)
      setSelected(null)
    }
  }

  const restart = () => { setQIdx(0); setSelected(null); setScore(0); setDone(false) }

  if (done) {
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100)
    return (
      <div className="text-center py-10 space-y-4">
        <div className="text-6xl">{pct >= 70 ? '🏆' : pct >= 50 ? '📚' : '😬'}</div>
        <h3 className="text-2xl font-bold text-gray-100">{score}/{QUIZ_QUESTIONS.length} correct</h3>
        <p className="text-gray-400">
          {pct >= 80 ? 'GTO master! Your opponents are in trouble.' :
           pct >= 60 ? 'Solid fundamentals. Keep studying the spots you missed.' :
           'Keep grinding the theory — it\'ll pay off at the tables.'}
        </p>
        <button onClick={restart} className="btn-primary px-8">Play Again</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Question {qIdx + 1} of {QUIZ_QUESTIONS.length}</p>
        <p className="text-xs text-green-400 font-semibold">{score} correct</p>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className="bg-green-600 h-1.5 rounded-full transition-all"
          style={{ width: `${((qIdx) / QUIZ_QUESTIONS.length) * 100}%` }} />
      </div>

      <div className="card p-5">
        <p className="text-gray-100 font-medium leading-relaxed">{q.q}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'border-gray-700 text-gray-300 hover:border-gray-500'
          if (answered) {
            if (i === q.answer) cls = 'border-green-600 bg-green-950/30 text-green-300'
            else if (i === selected) cls = 'border-red-700 bg-red-950/30 text-red-400'
            else cls = 'border-gray-800 text-gray-600'
          }
          return (
            <button key={i} onClick={() => pick(i)} disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${cls}`}>
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="card p-4 border-blue-900/50 bg-blue-950/20">
          <p className="text-blue-300 text-sm">{q.explanation}</p>
        </div>
      )}

      {answered && (
        <button onClick={next} className="btn-primary w-full">
          {qIdx + 1 >= QUIZ_QUESTIONS.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}

// ── Main GTO Tab ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'equity', label: '⚡ Equity Calc' },
  { id: 'ranges', label: '📊 Range Charts' },
  { id: 'quiz', label: '🧠 Hand Quiz' },
]

export default function GTO() {
  const [tab, setTab] = useState('equity')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-100">GTO Texas Hold'em Simulator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Practice equity calculations, study preflop ranges, and test your poker theory</p>
      </div>

      <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1 w-fit">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === id ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {tab === 'equity' && <EquityCalc />}
        {tab === 'ranges' && <RangeChart />}
        {tab === 'quiz' && <HandQuiz />}
      </div>
    </div>
  )
}
