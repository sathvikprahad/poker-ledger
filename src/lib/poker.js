// Texas Hold'em hand evaluator + equity calculator

export const RANKS = '23456789TJQKA'
export const SUITS = 'cdhs'
export const RANK_NAMES = {
  '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
  'T':'10','J':'Jack','Q':'Queen','K':'King','A':'Ace'
}
export const SUIT_SYMBOLS = { c:'♣', d:'♦', h:'♥', s:'♠' }

export function createDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  return deck
}

export function shuffle(deck) {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

// returns [category 8=SF..0=HC, ...tiebreakers]
export function evaluate5(cards) {
  const rs = cards.map((c) => RANKS.indexOf(c[0]))
  const ss = cards.map((c) => c[1])
  const flush = ss.every((s) => s === ss[0])

  const counts = {}
  rs.forEach((r) => (counts[r] = (counts[r] || 0) + 1))
  const pairs = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const groups = pairs.map(([r, c]) => [Number(r), c])

  let sorted = [...rs].sort((a, b) => b - a)
  // wheel straight: A-2-3-4-5
  const isWheel = sorted.join(',') === '12,3,2,1,0'
  const straight = isWheel ||
    (sorted[0] - sorted[4] === 4 && new Set(sorted).size === 5)

  if (straight && flush) {
    const high = isWheel ? 3 : sorted[0]
    return [8, high]
  }
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]]
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]]
  if (flush) return [5, ...sorted]
  if (straight) return [4, isWheel ? 3 : sorted[0]]
  if (groups[0][1] === 3) return [3, groups[0][0], groups[1][0], groups[2][0]]
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0]]
  if (groups[0][1] === 2) return [1, groups[0][0], groups[1][0], groups[2][0], groups[3][0]]
  return [0, ...sorted]
}

function compareHands(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? -1) > (b[i] ?? -1)) return 1
    if ((a[i] ?? -1) < (b[i] ?? -1)) return -1
  }
  return 0
}

export function evaluate7(cards) {
  let best = null
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const five = cards.filter((_, idx) => idx !== i && idx !== j)
      const val = evaluate5(five)
      if (!best || compareHands(val, best) > 0) best = val
    }
  }
  return best
}

export const HAND_NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
]

// Monte Carlo equity for 2–4 hands with optional board cards
export function calculateEquity(hands, board = [], simulations = 5000) {
  const wins = new Array(hands.length).fill(0)
  const ties = new Array(hands.length).fill(0)
  const usedCards = new Set([...hands.flat(), ...board])
  const deck = createDeck().filter((c) => !usedCards.has(c))

  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffle(deck)
    const needed = 5 - board.length
    const runout = [...board, ...shuffled.slice(0, needed)]

    const evals = hands.map((h) => evaluate7([...h, ...runout]))
    let best = evals[0]
    for (const e of evals) if (compareHands(e, best) > 0) best = e
    const winners = evals.reduce((acc, e, idx) => {
      if (compareHands(e, best) === 0) acc.push(idx)
      return acc
    }, [])
    if (winners.length === 1) wins[winners[0]]++
    else winners.forEach((idx) => ties[idx]++)
  }

  return hands.map((_, i) => ({
    win: (wins[i] / simulations) * 100,
    tie: (ties[i] / simulations) * 100,
    equity: ((wins[i] + ties[i] / 2) / simulations) * 100,
  }))
}

// 13x13 grid positions
export const GRID_RANKS = 'AKQJT98765432'.split('')

export function handStr(r1, r2, suited) {
  if (r1 === r2) return r1 + r2
  const ri1 = GRID_RANKS.indexOf(r1), ri2 = GRID_RANKS.indexOf(r2)
  const [hi, lo] = ri1 < ri2 ? [r1, r2] : [r2, r1]
  return hi + lo + (suited ? 's' : 'o')
}

// GTO-approximate preflop opening ranges (position → Set of hand strings)
export const OPEN_RANGES = {
  UTG: new Set([
    'AA','KK','QQ','JJ','TT','99','88',
    'AKs','AQs','AJs','ATs','KQs','KJs','QJs',
    'AKo','AQo',
  ]),
  MP: new Set([
    'AA','KK','QQ','JJ','TT','99','88','77',
    'AKs','AQs','AJs','ATs','A9s','KQs','KJs','KTs','QJs','QTs','JTs',
    'AKo','AQo','AJo','KQo',
  ]),
  CO: new Set([
    'AA','KK','QQ','JJ','TT','99','88','77','66',
    'AKs','AQs','AJs','ATs','A9s','A8s','A5s','A4s',
    'KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','98s',
    'AKo','AQo','AJo','ATo','KQo','KJo','QJo',
  ]),
  BTN: new Set([
    'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','QJs','QTs','Q9s','JTs','J9s','J8s','T9s','T8s','98s','87s','76s','65s',
    'AKo','AQo','AJo','ATo','A9o','KQo','KJo','KTo','QJo','QTo','JTo',
  ]),
  SB: new Set([
    'AA','KK','QQ','JJ','TT','99','88','77','66','55',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A5s','A4s','A3s',
    'KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','98s','87s','76s',
    'AKo','AQo','AJo','ATo','KQo','KJo','KTo','QJo',
  ]),
}

// Quiz questions
export const QUIZ_QUESTIONS = [
  {
    q: 'You have A♥K♥ on the BTN. Everyone folds to you. Action?',
    options: ['Fold', 'Call', 'Raise', 'Limp'],
    answer: 2,
    explanation: 'AKs on the BTN is a premium open — always raise for value and fold equity.',
  },
  {
    q: 'You flop top pair top kicker on a dry board (K♦7♣2♠) with AK. Action?',
    options: ['Check', 'Bet ~33% pot', 'Bet ~75% pot', 'All-in'],
    answer: 1,
    explanation: 'On dry, disconnected boards a small continuation bet (1/3 pot) extracts value while pricing in weaker Kx hands.',
  },
  {
    q: 'The board is A♣T♦5♦. You hold 7♦8♦. You have 9 flush outs + 6 straight outs. Roughly what % equity do you have?',
    options: ['~15%', '~30%', '~45%', '~60%'],
    answer: 2,
    explanation: 'With ~15 outs on the flop you have ~54% equity by the river using the rule of 4 (15×4=60, adjusted ~45-54%).',
  },
  {
    q: 'Pot is $100. Villain bets $50. What pot odds are you getting?',
    options: ['25%', '33%', '50%', '66%'],
    answer: 1,
    explanation: 'You must call $50 to win $150 total. 50/150 = 33%. You need 33% equity to break even.',
  },
  {
    q: 'You 3-bet preflop and C-bet the flop. Villain calls. Turn is a blank. Best play with no made hand?',
    options: ['Always barrel', 'Give up and check', 'Consider equity/fold equity before deciding', 'Shove'],
    answer: 2,
    explanation: 'Turn barreling depends on your equity (outs), fold equity (board texture / villain range), and SPR. Not an automatic barrel or give-up.',
  },
  {
    q: 'Which position has the most pre-flop opening range in GTO strategy?',
    options: ['UTG', 'MP', 'CO', 'BTN'],
    answer: 3,
    explanation: 'The button (BTN) acts last on every post-flop street — positional advantage lets you play the widest range profitably.',
  },
  {
    q: 'What does "SPR" stand for?',
    options: ['Stack-to-Pot Ratio', 'Starting Pot Range', 'Street-by-Street Profile', 'Speculative Play Range'],
    answer: 0,
    explanation: 'SPR = effective stack ÷ pot. Low SPR means you\'re committed; high SPR means more room for post-flop play.',
  },
  {
    q: 'You hold 66 in the BB vs a BTN raise. The flop is A♠K♦7♥. Best action?',
    options: ['Donk bet', 'Check-raise', 'Check-fold', 'Check-call one street'],
    answer: 2,
    explanation: 'With a small pocket pair on an A-K-high board and no draws, your equity is too low to continue vs a C-bet.',
  },
]
