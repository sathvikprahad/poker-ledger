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

// Quiz questions — 200-question pool; the UI draws 15 at random per session
export const QUIZ_QUESTIONS = [
  // ── Preflop ────────────────────────────────────────────────────────────────
  { q: 'You have A♥K♥ on the BTN. Everyone folds to you. Action?', options: ['Fold', 'Call', 'Raise', 'Limp'], answer: 2, explanation: 'AKs on the BTN is a premium open — always raise for value and fold equity.' },
  { q: 'Which position has the widest preflop opening range in GTO strategy?', options: ['UTG', 'MP', 'CO', 'BTN'], answer: 3, explanation: 'The BTN acts last on every postflop street — positional advantage lets you play the widest range profitably.' },
  { q: 'From UTG at a 9-handed table your opening range is approximately:', options: ['Top 5% of hands', 'Top 15%', 'Top 25%', 'Top 40%'], answer: 0, explanation: 'UTG at 9-handed you open roughly the top 5% — premium pairs, AKs, AQs, AKo. You act first postflop vs up to 8 opponents.' },
  { q: 'What is a "3-bet"?', options: ['Betting on third street', 'Re-raising the original raiser', 'Calling a raise', 'Going all-in preflop'], answer: 1, explanation: 'A 3-bet is re-raising the original raise. Blind = bet 1, open raise = bet 2, re-raise = bet 3.' },
  { q: 'You open UTG and face a 3-bet. You have JJ. Best action?', options: ['Always fold', 'Always shove', 'Call or 4-bet depending on depth and reads', 'Limp-reraise'], answer: 2, explanation: 'JJ vs a 3-bet is a close spot. Deep-stacked, calling is often best. Shallow or vs tight ranges, 4-betting is fine.' },
  { q: 'You have K♠Q♠ in the CO. Action folds to you. Best play?', options: ['Fold', 'Limp', 'Raise', 'Only open if tight table'], answer: 2, explanation: 'KQs is a strong CO open with 3 players left and high-equity postflop playability.' },
  { q: 'What does "position" mean in poker?', options: ['Where you sit physically', 'Whether you act before or after opponents postflop', 'Your stack size', 'Your blind level'], answer: 1, explanation: 'Position = acting order. Acting last (in position) is a major advantage — you see what opponents do before deciding.' },
  { q: 'You have 22 UTG at a full ring table. Best action?', options: ['Always fold', 'Open raise', 'Limp', 'Fold or raise — limping is worst'], answer: 3, explanation: '22 UTG is marginal. Open-folding or open-raising are both acceptable. Limping invites multiway pots where 22 loses equity.' },
  { q: 'Which hand plays better in a multiway pot?', options: ['AA', 'KK', 'T9s', 'AKo'], answer: 2, explanation: 'Suited connectors like T9s gain value with multiple callers — implied odds grow as more players contribute.' },
  { q: 'A "squeeze play" is:', options: ['A 3-bet over a raise and one or more cold callers', 'Slowplaying a strong hand', 'An all-in on the river', 'A slow roll'], answer: 0, explanation: 'A squeeze is a 3-bet over a raiser plus at least one caller. The callers are squeezed between you and the raiser.' },
  { q: 'You\'re on the BTN with JTs. Three players limp. Best action?', options: ['Fold — too many players', 'Limp along', 'Isolation raise', 'Shove to represent strength'], answer: 2, explanation: 'Isolation raising with JTs on the BTN is strong — you have position, a good hand, and can win with c-bets or hit the flop.' },
  { q: 'What is the "gap concept"?', options: ['You need a stronger hand to call a raise than to open', 'The gap between blinds', 'The gap between streets', 'The space between your cards'], answer: 0, explanation: 'Gap concept: to call a raise you need a stronger hand than the raiser needs to open, because the raiser has initiative and range advantage.' },
  { q: 'Against a BTN open, how wide should the BB defend?', options: ['Only top 15% of hands', 'Only premium hands', 'Fairly wide — pot odds and one opponent make it correct', 'Never — always 3-bet or fold'], answer: 2, explanation: 'The BB already has 1 BB invested and faces only one opponent, so wide defense (35-40%+ vs BTN) is correct given the pot odds.' },
  { q: 'You have AA preflop and three players limp before you. Best action?', options: ['Limp to trap', 'Raise large (4x+ 1x per limper)', 'Shove immediately', 'Call — see the flop cheap'], answer: 1, explanation: 'Raise large with AA after limpers. Multiway pots reduce AA\'s equity. You want to play heads-up or take it preflop.' },
  { q: 'KK should be 4-bet (vs a 3-bet) in most situations because:', options: ['It can\'t improve on the flop', 'It has too much equity to just call vs most 3-bet ranges', 'It\'s always ahead of 3-bet ranges', 'It blocks the nuts'], answer: 1, explanation: 'KK has enormous equity vs typical 3-bet ranges. 4-betting charges opponents and builds a big pot with the second-best starting hand.' },
  { q: 'Pocket pair 77 vs UTG raise — best action when 100BB deep?', options: ['Fold always', '3-bet for value', 'Call to set-mine if stacks allow', 'Limp behind'], answer: 2, explanation: 'Calling to set-mine is standard at 100BB — you lose often but stack opponents when you hit a set (~12% per flop).' },
  { q: 'What is "cold calling"?', options: ['Calling when it\'s cold outside', 'Calling a raise without having invested any money this round', 'Folding preflop', 'Calling on a dry board'], answer: 1, explanation: 'A cold call is calling a raise when you haven\'t put any money in this round yet. It requires a stronger hand than 3-betting.' },
  { q: 'SB vs BB heads-up (everyone else folded) — SB should open:', options: ['Only top 10%', 'Only premium pairs', 'Very wide — 40-50%+ of hands', 'Exactly the same as BTN'], answer: 2, explanation: 'SB vs BB is heads-up with positional disadvantage postflop, but you can open very wide (40-50%+) since only one opponent remains.' },
  { q: 'A suited hand is worth roughly how much more equity than its offsuit equivalent?', options: ['Less than 1%', '2-4% more', '10-15% more', '20% more'], answer: 1, explanation: 'Suited adds ~2-4% raw preflop equity. The bigger edge is playability — better implied odds and more nut flush combinations.' },
  { q: 'You open A♠J♠ from CO and face a BTN 3-bet. Best response?', options: ['Always 4-bet', 'Fold — AJs is dominated', 'Call or occasionally 4-bet as a bluff', 'Limp-call'], answer: 2, explanation: 'AJs has strong equity vs BTN 3-bet ranges. Calling is standard; occasionally 4-betting as a bluff with good blockers is also fine.' },
  { q: 'When is limping preflop a poor play?', options: ['When you have strong hands like AA, KK, AKs', 'When you\'re in early position', 'Both A and B', 'Limping is never poor'], answer: 2, explanation: 'Limping strong hands surrenders fold equity and disguises strength. Limping from early position invites multiway pots where big cards lose edge.' },
  { q: 'What preflop raise size is standard for a first open?', options: ['1 big blind', '2 big blinds', '2.5–3 big blinds', '5+ big blinds'], answer: 2, explanation: 'Standard open-raise is 2.5–3x BB in most games. Live games often go 3x+. You want to build a pot but not overcommit.' },
  { q: 'You have QQ and face a 4-bet from a tight UTG player. Best play?', options: ['Always call — QQ is too good to fold', 'Consider folding vs very tight 4-bet ranges', 'Always 5-bet shove', 'Limp-call was better earlier'], answer: 1, explanation: 'vs tight UTG 4-bets (representing AA/KK), QQ can be a fold or call — shoving or snap-calling is often too loose vs the tightest ranges.' },
  { q: 'What is the maximum starting hand equity any hand can have vs one random opponent?', options: ['About 67%', 'About 77%', 'About 85%', 'About 95%'], answer: 2, explanation: 'AA vs a random hand has roughly 85% equity. Even the best hand cannot guarantee a win — ~15% of random hands have live outs.' },
  { q: 'In 6-max games versus full ring, opening ranges should be:', options: ['Tighter — fewer players = more pressure', 'The same — ranges are universal', 'Wider — fewer players = less risk', 'Only suited hands'], answer: 2, explanation: 'In 6-max, you open wider because fewer opponents remain to wake up with hands behind you, and every position is "closer" to the BTN.' },

  // ── Pot Odds & Math ────────────────────────────────────────────────────────
  { q: 'Pot is $100. Villain bets $50. What pot odds are you getting?', options: ['25%', '33%', '50%', '66%'], answer: 1, explanation: 'Call $50 to win $150 total. 50/150 = 33%. You need >33% equity to profit.' },
  { q: 'You have 9 outs on the flop. Using the Rule of 4, your equity to the river is roughly:', options: ['9%', '18%', '36%', '54%'], answer: 2, explanation: 'Rule of 4: outs × 4 for flop-to-river equity. 9 × 4 = 36%. More precisely ~35%.' },
  { q: 'The Rule of 2 is used on which street?', options: ['Preflop', 'Flop (to river)', 'Turn (to river only)', 'River'], answer: 2, explanation: 'Rule of 2: outs × 2 for one card to come (turn→river). Rule of 4 for two cards to come (flop→river).' },
  { q: 'An open-ended straight draw has how many outs?', options: ['4', '6', '8', '12'], answer: 2, explanation: 'An OESD has 8 outs — 4 cards on each end complete the straight.' },
  { q: 'A gutshot straight draw has how many outs?', options: ['4', '6', '8', '12'], answer: 0, explanation: 'A gutshot (inside straight draw) has 4 outs — only one specific rank completes the straight.' },
  { q: 'A flush draw has how many outs?', options: ['7', '9', '11', '13'], answer: 1, explanation: 'A flush draw has 9 outs — 13 cards of the suit minus 4 already known (2 in hand, 2 on board).' },
  { q: 'What are "implied odds"?', options: ['Current pot size odds', 'Future chips you expect to win if you hit', 'Your opponent\'s hand strength', 'The house rake'], answer: 1, explanation: 'Implied odds account for money you expect to win on future streets when you hit your draw — making some calls correct even when pot odds say fold.' },
  { q: 'Pot is $200. You bluff. Villain folds 50% of the time. What bet size breaks even?', options: ['$50', '$100', '$200', '$400'], answer: 2, explanation: 'Break-even bluff: fold% × pot = bet. 0.5 × $200 = $100 won when they fold. Bet = $200 → break even at 50% fold frequency. Actually bet size where fold% × (pot+bet) = bet. At 50% fold: 0.5 × (200+bet) = bet → 100 = 0.5bet → bet = $200.' },
  { q: 'What is Minimum Defense Frequency (MDF)?', options: ['How often you must continue to prevent profitable bluffs', 'The minimum bet size allowed', 'How often you fold to 3-bets', 'Minimum BB defense rate'], answer: 0, explanation: 'MDF = pot/(pot+bet). If you fold more than 1-MDF of your range, your opponent can profitably bluff 100% of their air.' },
  { q: 'Pot $100, villain bets $100. What is the MDF?', options: ['33%', '50%', '67%', '75%'], answer: 1, explanation: 'MDF = 100/(100+100) = 50%. You must continue with at least half your range to prevent pure bluffs from always profiting.' },
  { q: 'Pot odds of 4:1 requires what minimum equity to call?', options: ['20%', '25%', '33%', '50%'], answer: 0, explanation: '4:1 odds = risk 1 to win 4, so 1/5 = 20% equity needed to break even.' },
  { q: 'You have top pair vs an overpair on the flop. How many outs do you roughly have?', options: ['2', '5', '7', '10'], answer: 1, explanation: 'Top pair vs overpair: ~5 outs (two pair cards + trips cards) give you roughly 5 clean outs to improve.' },
  { q: 'What does "EV" mean in poker?', options: ['How much you expect to win this session', 'The average amount won or lost from an action taken many times', 'Your best possible outcome', 'Your guaranteed profit'], answer: 1, explanation: 'EV = Expected Value — the long-run average result of a decision. Making +EV decisions consistently is the goal of good poker.' },
  { q: 'The pot is $80. Villain bets $40. You have a flush draw (~20% equity). Should you call?', options: ['Yes — pot odds justify it', 'No — 20% equity < 33% needed', 'Only if in position', 'Never call draws'], answer: 1, explanation: 'Call $40 into $120 total = 33% pot odds needed. With only 20% equity, you don\'t have the right price without strong implied odds.' },
  { q: 'Pot $60. You bet $20 as a bluff. How often must villain fold for it to be immediately profitable?', options: ['20%', '25%', '33%', '50%'], answer: 1, explanation: 'Breakeven = bet/(pot+bet) = 20/80 = 25%. If villain folds >25% of the time, the bluff shows immediate profit.' },
  { q: 'A "combo draw" (flush draw + open-ended straight draw) has approximately how many outs?', options: ['9', '12', '15', '18'], answer: 2, explanation: 'Flush draw (9) + OESD (8) minus overlaps (2 shared outs) = approximately 15 outs — one of the strongest draws in hold\'em.' },
  { q: 'What is "fold equity"?', options: ['Equity you gain when opponents fold', 'The amount of equity in folded hands', 'Your equity when folding yourself', 'Passive equity from checking'], answer: 0, explanation: 'Fold equity is the additional value you gain from opponents folding to your bet. Aggressive plays extract fold equity on top of hand equity.' },
  { q: 'You have AA vs two random hands preflop. Your approximate equity is:', options: ['99%', '80%', '65%', '50%'], answer: 2, explanation: 'AA vs 2 random hands ≈ 65-70% equity. Each random hand has ~17-18%, two combine to give you roughly 30-35% chance to lose.' },
  { q: 'AKo vs QQ preflop is approximately:', options: ['80/20 in favor of QQ', '54/46 in favor of QQ', '50/50 exactly', '55/45 in favor of AKo'], answer: 1, explanation: 'AKo vs QQ is a classic "race" — QQ leads ~53-55% to AK\'s ~45-47%. Neither is a huge favorite.' },
  { q: 'You have a backdoor flush draw on the flop. How much equity does it add roughly?', options: ['~1%', '~4%', '~10%', '~15%'], answer: 1, explanation: 'A backdoor flush draw adds roughly 3-4% equity — you need two running flush cards, which happens rarely but meaningfully.' },
  { q: 'What is "equity realization"?', options: ['The equity you actually capture given position, initiative, and playability', 'Calculating pot odds', 'Knowing your outs', 'Your win rate'], answer: 0, explanation: 'Equity realization is how much of your raw equity you actually convert. In position with initiative you realize more equity than out of position.' },
  { q: 'A set vs top pair on the flop is approximately what favorite?', options: ['55/45', '70/30', '85/15', '95/5'], answer: 2, explanation: 'A set vs top pair is roughly an 85-90% favorite — top pair needs running specific cards to beat a set.' },

  // ── Postflop & C-Betting ───────────────────────────────────────────────────
  { q: 'You flop top pair top kicker on a dry board (K♦7♣2♠) with AK. Action?', options: ['Check', 'Bet ~33% pot', 'Bet ~75% pot', 'All-in'], answer: 1, explanation: 'On dry, disconnected boards a small c-bet (1/3 pot) extracts value while pricing in weaker Kx hands.' },
  { q: 'What is a "wet" board?', options: ['A board with high cards', 'A board with many draw possibilities', 'A board with paired cards', 'A board below 8-high'], answer: 1, explanation: 'A wet board has many flush and straight draw combinations — e.g., 9♥8♥7♦. Wet boards favor the caller\'s range.' },
  { q: 'You 3-bet preflop and c-bet the flop. Villain calls. Turn is a blank. No made hand. Best play?', options: ['Always barrel', 'Always check and give up', 'Consider equity and fold equity before deciding', 'Always shove'], answer: 2, explanation: 'Turn barreling depends on your equity (outs), fold equity (board texture/villain range), and SPR — not automatic either way.' },
  { q: 'You check-raise the flop. What does this typically represent?', options: ['Weakness', 'Very strong hand or strong semi-bluff draw', 'A standard c-bet counter', 'Uncertainty about hand strength'], answer: 1, explanation: 'Check-raising represents strength — either a made hand building the pot or a powerful semi-bluff draw with excellent equity.' },
  { q: 'The flop is 2♣3♦4♠. You 3-bet preflop and have AK. Should you c-bet?', options: ['Yes — you\'re the aggressor', 'Rarely — low connected boards hit the caller\'s range far more', 'Always with 100% pot', 'Only if in position'], answer: 1, explanation: 'Low connected boards (2-3-4) hit the caller\'s range (56s, 65s, A5s etc.) far harder than the 3-bettor\'s big-card range. Checking is often correct.' },
  { q: 'You have the nut flush draw on the flop. Villain bets. You should:', options: ['Always fold — draws are risky', 'Call if you have position', 'Consider raising as a semi-bluff', 'Never raise draws'], answer: 2, explanation: 'Raising with the nut flush draw as a semi-bluff is powerful — you win when they fold AND when you hit. Especially effective in position.' },
  { q: 'What bet size is best for value on a very dry board vs a sticky caller?', options: ['25% pot', '50% pot', '100% pot', '150% pot'], answer: 1, explanation: 'Against sticky callers on dry boards, ~50% pot extracts value without risking too much while keeping their calling range wide.' },
  { q: 'The board pairs on the turn. You had top pair. Your relative hand strength:', options: ['Improves — pairs are good', 'Neutral', 'Decreases — full houses and quads become possible', 'Doubles'], answer: 2, explanation: 'A paired board activates full houses and sets, reducing top pair to a weaker relative hand. Proceed more cautiously.' },
  { q: 'You have 9♣8♣ on 7♥6♦2♠. What draw do you have?', options: ['Flush draw', 'Gutshot straight draw', 'Open-ended straight draw', 'Overcards only'], answer: 2, explanation: '9-8 on 7-6-2: a 5 makes 9-8-7-6-5 and a T makes T-9-8-7-6. Both ends complete — open-ended straight draw with 8 outs.' },
  { q: 'With the nuts on the river, you should size your bet:', options: ['Always the minimum', 'Always all-in', 'Based on what sizing villain will actually call', 'Exactly 50% pot'], answer: 2, explanation: 'River value-bet sizing should maximize chips extracted — choose an amount villain\'s actual range will call most often.' },
  { q: 'You have top two pair on a flush-completing river. Villain pots it. Best play?', options: ['Fold — flush beats you', 'Always call', 'Raise — two pair is strong', 'Call or fold based on villain\'s specific range'], answer: 3, explanation: 'When the flush completes and villain pots it, evaluate: how often do they bluff vs value here? Do you block any flushes? Range analysis decides.' },
  { q: 'In a 3-bet pot, who typically has the "nut advantage"?', options: ['The caller', 'The 3-bettor', 'The player with position', 'Neither — it\'s equal'], answer: 1, explanation: 'The 3-bettor has a more condensed, stronger range — they hold more nutted combinations on most board textures.' },
  { q: 'What is a "float"?', options: ['Folding to a bluff', 'Calling a bet intending to bluff on a later street', 'Checking back in position', 'Leading the turn after calling the flop'], answer: 1, explanation: 'Floating means calling a bet (usually a c-bet) without a strong hand, planning to take the pot away on the next street when opponent shows weakness.' },
  { q: 'What is a "probe bet"?', options: ['A small bet to see opponent\'s interest', 'Betting into the preflop aggressor after they check the flop', 'A bluff on the river', 'Raising a flop bet'], answer: 1, explanation: 'A probe bet exploits the preflop aggressor\'s flop check — they showed weakness by not c-betting, so you take the lead.' },
  { q: 'You hold 66 in the BB vs a BTN raise. Flop is A♠K♦7♥. Best action?', options: ['Donk bet', 'Check-raise', 'Check-fold', 'Check-call one street'], answer: 2, explanation: 'With a small pair on an A-K-high board and no draws, your equity is too low to continue vs most c-bets.' },
  { q: 'You have KK and the flop comes A♥7♦2♣. Villain bets big. You should:', options: ['Always fold — Ace is out', 'Evaluate how likely villain has an Ace given their range', 'Always call — KK is too good to fold', 'Always raise — might be bluffing'], answer: 1, explanation: 'KK on A-high is a tough spot. Did villain raise UTG (likely has an Ace) or BTN (wider range)? Context determines the right play.' },
  { q: 'You have Q♠J♦ on K♥T♣2♠. What draw do you have?', options: ['Flush draw', 'Gutshot straight draw', 'Open-ended straight draw', 'No draw — just overcards'], answer: 2, explanation: 'QJ on KT2: an Ace completes A-K-Q-J-T (broadway) and a 9 completes K-Q-J-T-9. Both ends complete — open-ended with 8 outs.' },
  { q: 'Villain check-calls flop and turn, then leads small on the river. This line typically represents:', options: ['Always a bluff', 'Always the nuts', 'A medium made hand going for thin value or a missed draw bluffing cheap', 'A polarized range'], answer: 2, explanation: 'Check-call twice then small lead river is often a medium made hand (two pair, trips) looking for thin value, or a missed draw trying a cheap bluff.' },
  { q: 'You have top pair on the flop. The turn brings a possible straight. Villain check-raises your bet. Best play?', options: ['Always fold', 'Always call — pot committed', 'Fold unless you have a clear read they bluff-raise here', 'Re-raise to represent the straight'], answer: 2, explanation: 'Turn check-raises are heavily weighted toward made straights or powerful draws. Folding top pair to a turn check-raise is often correct.' },
  { q: 'What does "equity denial" mean?', options: ['Refusing to calculate equity', 'Betting to prevent opponents realizing their draw equity for free', 'Folding strong hands', 'Playing draws aggressively'], answer: 1, explanation: 'Equity denial is betting to charge opponents for their draws — forcing them to pay for cards that could beat you.' },
  { q: 'On the river with a missed draw and no showdown value, you should:', options: ['Always check and fold', 'Consider bluffing if you have blockers and villain\'s range is weak', 'Always bluff — you can\'t win at showdown', 'Only bluff if you have position'], answer: 1, explanation: 'Missed draws make excellent bluff candidates — you have no showdown value and blockers to strong hands. Evaluate fold equity before deciding.' },
  { q: 'Multiway pots (3+ players) require:', options: ['More bluffing — harder to have it', 'Stronger hands to bet for value and fewer bluffs', 'The same strategy as heads-up', 'Only nut hands to play'], answer: 1, explanation: 'More opponents = more likely someone has a strong hand. Bluffs are less effective and you need stronger holdings for value bets.' },
  { q: 'What bet sizing is most effective on a very dynamic, coordinated board?', options: ['Very small (20% pot)', 'Small (33% pot)', 'Large (75%+ pot)', 'Overbet (150%+ pot)'], answer: 2, explanation: 'On wet, coordinated boards you want to charge draws with larger bets. Small bets on wet boards give draws too-good a price to call.' },
  { q: 'You have A♠J♣ on a board of A♥K♦Q♠. Villain bets pot. You should:', options: ['Always fold — you\'re likely behind', 'Call — top pair is strong', 'Raise — two pair possible', 'Evaluate carefully — this board hits many strong holdings'], answer: 3, explanation: 'AJ on AKQ: you have top pair decent kicker, but the board is extremely dangerous. KK, QQ, AK, AQ, JT all make better hands or strong draws. Proceed with caution.' },
  { q: 'Checking back in position on the flop with a strong hand is called:', options: ['Slowplaying', 'Floating', 'A probe bet', 'Range balancing'], answer: 0, explanation: 'Slowplaying means checking a strong hand to disguise its strength and induce bluffs or allow opponents to improve to second-best hands.' },

  // ── Hand Reading & Ranges ──────────────────────────────────────────────────
  { q: 'Villain 3-bets you preflop, then checks back the flop on a dry Ace-high board. What does this likely mean?', options: ['They have an Ace and are slowplaying', 'They likely missed — don\'t have an Ace in range', 'They have a set', 'They\'re always bluffing here'], answer: 1, explanation: 'Most 3-bettors c-bet dry Ace-high boards as the aggressor — checking back often means they don\'t have an Ace and missed.' },
  { q: 'Villain raises the turn after calling the flop. This usually indicates:', options: ['A bluff always', 'A very strong hand or powerful draw', 'Just top pair', 'Weakness testing you'], answer: 1, explanation: 'Turn raises from a flop caller represent great strength — they either have a monster or a combo draw with massive equity.' },
  { q: 'What does "blockers" mean in poker?', options: ['Cards in hand that reduce combinations of certain opponent holdings', 'Players who block the pot', 'Hands that block draws', 'Checking to block a bet'], answer: 0, explanation: 'Blockers are cards in your hand that make certain opponent hands less likely. Holding A♥ means they can\'t have the nut flush with A♥.' },
  { q: 'A "polarized" range contains:', options: ['Only medium-strength hands', 'Very strong hands AND bluffs, but no medium hands', 'Only the strongest hands', 'An equal mix of everything'], answer: 1, explanation: 'Polarized ranges contain nutted hands and bluffs. It\'s optimal for large bets since medium hands don\'t benefit from big sizing.' },
  { q: 'A "merged" (linear) range contains:', options: ['Only bluffs', 'A spectrum of value hands from strong to medium, few pure bluffs', 'Only the very top hands', 'Random hands'], answer: 1, explanation: 'A merged range bets across a spectrum of value hands. It\'s used with smaller sizes where medium hands still extract value.' },
  { q: 'Villain donk-bets the river after check-calling flop and turn. This typically represents:', options: ['Always a bluff', 'Always the nuts', 'A polarized range — either strong or a missed draw bluffing', 'Top pair, weak kicker'], answer: 2, explanation: 'River donk bets are usually polarized: either a strong made hand they don\'t want to check-fold, or a missed draw turned into a cheap bluff.' },
  { q: 'What is a "range advantage"?', options: ['Having more cards in the deck', 'One player\'s range connecting better with a board texture', 'Always having a stronger hand', 'Having more suited hands'], answer: 1, explanation: 'Range advantage means your overall hand distribution makes more strong hands on a given board — influencing who should bet or check.' },
  { q: 'You hold the nut flush blocker on the river and missed a straight draw. You should consider bluffing because:', options: ['Bluffs always work on the river', 'Villain is less likely to have the nuts — your bluff gets called less', 'You have position', 'You have no showdown value anyway'], answer: 1, explanation: 'Nut blockers are powerful bluffing tools — holding A♥ on a heart board means villain can\'t have the nut flush, so your bluff gets through more.' },
  { q: 'A player tanks for 2+ minutes before betting the river. This often indicates:', options: ['A bluff with fake hesitation', 'A strong hand deliberating over sizing', 'A medium hand', 'Random behavior'], answer: 1, explanation: 'Long tanks before betting on the river often indicate a strong hand with a sizing decision. Bluffs are often executed quickly (pre-planned).' },
  { q: 'Villain min-bets the river. This typically means:', options: ['The weakest possible hand', 'A strong hand blocking your raise', 'Either blocking/value-thin or a pure bluff', 'Always top pair'], answer: 2, explanation: 'River min-bets are either blocking bets (strong hand charging you cheaply) or cheap bluffs. They rarely represent the total nuts or total air exclusively.' },
  { q: 'What does a large river overbet (150%+ pot) from villain typically represent?', options: ['A bluff always', 'A polarized range — big value or big bluff, rarely medium', 'Middle pair trying to win', 'Standard sizing'], answer: 1, explanation: 'Overbets are polarized. The bettor has either a very strong hand maximizing vs weaker calling ranges, or a bluff representing that strength.' },

  // ── GTO Concepts ──────────────────────────────────────────────────────────
  { q: 'What does GTO stand for?', options: ['Great Tournament Opponent', 'Game Theory Optimal', 'Good Table Odds', 'Generally Takes Outs'], answer: 1, explanation: 'GTO (Game Theory Optimal) is a balanced strategy that cannot be exploited, even if opponents know exactly what you\'re doing.' },
  { q: 'When should you deviate from GTO and play exploitatively?', options: ['Never — GTO is always best', 'When you have clear reads on opponent tendencies', 'Only in tournaments', 'Only when losing'], answer: 1, explanation: 'GTO protects against exploitation. When opponents have clear leaks, exploiting those leaks earns more EV than a balanced GTO approach.' },
  { q: 'A "balanced" strategy means:', options: ['Betting the same size every time', 'Having value hands and bluffs in your range at the right ratio', 'Playing conservatively', 'Calling as often as folding'], answer: 1, explanation: 'Balancing means having the right mix of value and bluffs in every betting line — preventing opponents from exploiting your frequencies.' },
  { q: 'What does SPR stand for?', options: ['Stack-to-Pot Ratio', 'Starting Pot Range', 'Street-by-Street Profile', 'Speculative Play Range'], answer: 0, explanation: 'SPR = effective stack ÷ pot. Low SPR means you\'re committed; high SPR means more postflop complexity.' },
  { q: 'With a low SPR (under 3), which hands perform best?', options: ['Suited connectors', 'Top pair and better', 'Pocket pairs below TT', 'Flush draws'], answer: 1, explanation: 'Low SPR favors top pair and better — you\'re committing your stack and don\'t need a hand that improves dramatically to be profitable.' },
  { q: 'With a high SPR (over 10), which hands perform best?', options: ['Top pair weak kicker', 'AA always', 'Speculative hands — sets, straights, flushes', 'Offsuit big cards'], answer: 2, explanation: 'High SPR favors speculative hands — there\'s lots of money to win by hitting big hands and stacking deep opponents.' },
  { q: 'You have AA on a K72 board with ~1x pot behind (SPR ~1). Action?', options: ['Check to slow play', 'Fold — dangerous board', 'Get it in — you\'re committed at SPR 1', 'Only call, never raise'], answer: 2, explanation: 'SPR of 1 means you\'re pot committed. AA is ahead of almost all realistic ranges on K72. Get it in.' },
  { q: '"Equity realization" is higher when you are:', options: ['Out of position without initiative', 'In position with initiative (as the aggressor)', 'Short-stacked', 'Playing multiway pots'], answer: 1, explanation: 'In position with initiative, you can take free cards, bet when strong, and bluff when weak — realizing more of your raw equity.' },
  { q: 'A GTO-balanced river bet with a polarized range should contain bluffs at what ratio?', options: ['50% bluffs always', 'Bluffs sized so villain is indifferent to calling (pot-size-dependent)', 'As many bluffs as value hands', 'No bluffs — only bet value'], answer: 1, explanation: 'GTO balance: at pot odds of X%, you need enough bluffs so villain breaks even calling — the exact ratio depends on your bet size.' },
  { q: 'What is "range merging" in a betting context?', options: ['Combining two players\' ranges', 'Betting medium and strong hands together at smaller sizes', 'Merging preflop and postflop ranges', 'Playing all hands the same'], answer: 1, explanation: 'Range merging means betting both strong and medium-strength hands together (merged) with smaller sizing to extract value across a wide range.' },

  // ── Tournament & Cash Game ─────────────────────────────────────────────────
  { q: 'What does ICM stand for?', options: ['Individual Card Management', 'Independent Chip Model', 'In-Cash Multiplier', 'Initial Chip Method'], answer: 1, explanation: 'ICM (Independent Chip Model) calculates the real $ value of tournament chips, where each chip isn\'t worth the same in dollar terms.' },
  { q: 'Near the money bubble in a tournament, medium stacks should:', options: ['Play the same as always', 'Take maximum risks to chip up', 'Tighten up — let short stacks bust out', 'Go all-in every hand'], answer: 2, explanation: 'ICM pressure increases near the bubble. Short stacks bust themselves; medium stacks should avoid risky spots and let the bubble burst.' },
  { q: 'In a cash game, should you always rebuy to a full stack after busting?', options: ['No — save your bankroll', 'Yes — full stack maximizes implied odds and value', 'Only if you\'re winning', 'Only if you\'re card dead'], answer: 1, explanation: 'Playing a full stack maximizes implied odds and ensures you can extract maximum value from strong hands. Short-stacking is a deliberate exploitative strategy, not default.' },
  { q: 'What is "blind stealing"?', options: ['Physically taking chips', 'Raising from late position to win the blinds uncontested', 'Defending your blind aggressively', 'Posting your blind late'], answer: 1, explanation: 'Blind stealing = open-raising from late position (CO, BTN, SB) hoping everyone folds and you collect the blinds without seeing a flop.' },
  { q: 'At a 9-handed final table with ICM pressure, you should call off shoves:', options: ['The same as a cash game', 'Looser — you need chips', 'Tighter — the risk of busting outweighs equity gain', 'Only with premium hands like AA/KK'], answer: 2, explanation: 'ICM significantly tightens call-off ranges at final tables. Busting costs proportionally more tournament equity than winning that same pot gains.' },
  { q: 'Standard bankroll management for cash games recommends having how many buy-ins?', options: ['5', '10', '20-30', '100'], answer: 2, explanation: 'Standard BRM for cash games: 20-30 buy-ins. This cushions downswings without risking going broke on normal variance.' },
  { q: 'You\'re on a 10 buy-in downswing. Best response?', options: ['Move up to win back losses faster', 'Review your play and consider moving down stakes', 'Chase with larger bets', 'Quit poker'], answer: 1, explanation: 'A sustained downswing warrants honest self-review. Moving down stakes rebuilds confidence and protects bankroll — chasing losses is a classic costly mistake.' },
  { q: 'What is a "bounty tournament"?', options: ['A tournament with no blinds', 'A tournament where you earn a prize for each player you eliminate', 'A winner-takes-all format', 'A tournament on a boat'], answer: 1, explanation: 'In bounty tournaments each player has a bounty. Eliminating them earns you cash, incentivizing looser and more aggressive play against short stacks.' },
  { q: 'The rake is:', options: ['A gardening tool', 'The fee the casino or site takes from each pot', 'A poker betting term', 'A tournament structure fee'], answer: 1, explanation: 'Rake is the house\'s cut from each pot (typically 2-5% up to a cap). Beating the rake is part of being a winning player — it adds up significantly over time.' },
  { q: 'In a cash game, the primary difference from tournament play is:', options: ['Cash uses different cards', 'Chips always represent their direct dollar value — there\'s no ICM', 'Blinds don\'t increase', 'You can\'t go all-in'], answer: 1, explanation: 'In cash games, chips = their exact dollar value with no ICM distortion. Losing a stack just costs you money, not tournament equity.' },

  // ── Player Types & Psychology ──────────────────────────────────────────────
  { q: 'Against a "calling station" who never folds, you should:', options: ['Bluff more — they\'ll eventually fold', 'Value bet thinner and reduce bluffing', 'Play balanced GTO', 'Avoid playing pots with them'], answer: 1, explanation: 'Against calling stations, exploit them by value betting more often and more thinly, and cutting bluffs entirely since they never work.' },
  { q: 'A "nit" is a player who:', options: ['Plays too many hands aggressively', 'Plays very few hands — only strong ones', 'Calls everything', 'Bluffs constantly'], answer: 1, explanation: 'A nit plays very few hands and almost exclusively for value. Exploit by folding to their aggression — they almost never bluff.' },
  { q: 'A LAG (Loose-Aggressive) player is best countered by:', options: ['3-betting very wide', 'Tightening up and letting them bluff into your strong hands', 'Limping more', 'Always folding to their bets'], answer: 1, explanation: 'Against a LAG, tighten your range, call down lighter (they bluff a lot), and trap with strong hands — let their aggression work against them.' },
  { q: 'What is "tilt"?', options: ['A poker table design', 'Playing emotionally and making sub-optimal decisions after bad results', 'A tilted pot', 'A slow roll'], answer: 1, explanation: 'Tilt is emotional deterioration of your decision-making, often after bad beats or coolers. Recognizing and stopping tilt is crucial for long-run results.' },
  { q: 'A "fish" in poker slang is:', options: ['A very skilled player', 'A weak recreational player who makes many mistakes', 'A player who bluffs constantly', 'A player who folds too much'], answer: 1, explanation: 'A "fish" is a losing recreational player — the profit source for the poker economy. Playing more pots vs fish is where most of your edge comes from.' },
  { q: 'What is "table selection"?', options: ['Choosing where to sit physically', 'Choosing which table or game to play at based on player quality', 'Choosing your game variant', 'Selecting your starting hand range'], answer: 1, explanation: 'Table selection is one of the highest-EV decisions in poker. Choosing tables with weaker opponents dramatically increases your win rate.' },
  { q: 'What does VPIP stand for?', options: ['Very Profitable Investment Position', 'Voluntarily Put In Pot — % of hands you voluntarily invest preflop', 'Value Playing In Position', 'Variance Per Individual Play'], answer: 1, explanation: 'VPIP measures how often you put money in voluntarily preflop (excluding unchallenged BB). A healthy TAG VPIP is 15-25%.' },
  { q: 'What does PFR stand for?', options: ['Post-Flop Range', 'Preflop Raise percentage', 'Pot-size Fold Rate', 'Player First Response'], answer: 1, explanation: 'PFR = Preflop Raise %. High PFR relative to VPIP means you\'re playing aggressively, raising rather than calling most of your hands.' },

  // ── Specific Scenarios & Concepts ─────────────────────────────────────────
  { q: 'You have AA preflop. Villain shoves all-in. You should:', options: ['Consider folding — they might have AA too', 'Call — you have the best hand or are chopping', 'Only call if you have position', 'Fold if the pot is small'], answer: 1, explanation: 'With AA vs a shove, you call every time. Even vs KK you\'re a massive favorite. The only exception is vs another AA (chop).' },
  { q: 'What is a "cooler"?', options: ['A bad beat', 'A hand where two players both play correctly but one loses to an unlikely card', 'Two very strong hands colliding where one must lose', 'A cold call'], answer: 2, explanation: 'A cooler is when two players make the same correct decision with strong hands — like KK vs AA all-in preflop. Unavoidable and not a mistake.' },
  { q: 'Losing with AA vs 72o all-in preflop is:', options: ['A cooler', 'A bad beat', 'A coin flip', 'Normal EV calculation'], answer: 1, explanation: 'AA vs 72o where 72 wins through unlikely cards is a bad beat — losing as a massive favorite (~88-12%) via variance.' },
  { q: 'QQ vs AKo all-in preflop is known as:', options: ['A cooler', 'A bad beat', 'A flip / coin flip', 'A dominated hand'], answer: 2, explanation: 'QQ vs AKo is a classic "flip" — roughly 54% vs 46%. Neither hand is a huge favorite before the board runs out.' },
  { q: 'What is the best starting hand in Texas Hold\'em?', options: ['AKs', 'KK', 'AA', 'AKo'], answer: 2, explanation: 'Pocket Aces (AA) is the best starting hand — roughly 85% equity vs any random hand, and it beats every other hand preflop.' },
  { q: 'In heads-up play, who posts the small blind?', options: ['The player to the left of the dealer', 'The dealer/button posts the SB', 'Whoever won the last hand', 'Alternates each hand'], answer: 1, explanation: 'In heads-up poker, the BTN/dealer posts the small blind and acts FIRST preflop. The other player is BB and acts first postflop.' },
  { q: 'What is a "straddle"?', options: ['Straddling two positions', 'A voluntary third blind posted before cards are dealt', 'Calling a raise', 'Playing two hands at once'], answer: 1, explanation: 'A straddle is a voluntary blind (usually 2x BB) posted by UTG before cards, giving them last action preflop and creating a bigger initial pot.' },
  { q: 'What is "running it twice"?', options: ['Playing a second session', 'Dealing remaining community cards twice when all-in, splitting pot based on each runout', 'Checking twice', 'Going all-in on two streets'], answer: 1, explanation: 'Running it twice deals the remaining cards twice — each runout determines half the pot. Both players must agree. It reduces variance.' },
  { q: 'What is "pot-committed"?', options: ['Required to bet the pot', 'Having invested so much that calling an all-in is mathematically correct', 'Always betting the pot size', 'Committed to a specific pot'], answer: 1, explanation: 'Pot-committed means folding would be -EV given how much you\'ve invested relative to the pot size — calling off the remainder is correct.' },
  { q: 'Which hand dominates which? AK vs KQ:', options: ['KQ dominates AK', 'AK dominates KQ', 'They\'re equal', 'Depends on suits'], answer: 1, explanation: 'AK dominates KQ — both share a King, but AK always has a live Ace kicker. KQ wins only by pairing Q or making two pair / better.' },
  { q: 'A "rainbow" board means:', options: ['All four suits are present', 'Three different suits — no flush draw possible', 'Two suits — one flush draw', 'A monotone board'], answer: 1, explanation: 'A rainbow board has three different suits — no flush draw is possible on that flop (e.g., K♥7♦2♣ = rainbow).' },
  { q: 'You have 88. The board is 8♥8♦K♣. What do you have?', options: ['A full house', 'Quads', 'Two pair', 'Trips'], answer: 1, explanation: 'With two 8s in hand and two on the board, you have four 8s — quad eights, one of the strongest hands possible.' },
  { q: 'The board is A♥K♥Q♥J♥. You hold T♥. What do you have?', options: ['A flush', 'A straight', 'A straight flush', 'A royal flush'], answer: 3, explanation: 'A-K-Q-J-T all in hearts = a royal flush — the absolute best hand in poker.' },
  { q: 'You are in position on the BTN with a strong draw. Should you raise or call a flop c-bet?', options: ['Always raise', 'Always call', 'Mix raises and calls based on board and opponent', 'Fold — draws are risky'], answer: 2, explanation: 'Strong draws in position benefit from a mixed strategy — raising builds the pot and adds fold equity; calling keeps opponent\'s range wide for later streets.' },
  { q: 'What is a "donk bet" in modern poker parlance?', options: ['Betting like a bad player', 'Leading into the preflop aggressor from out of position', 'Calling a big raise', 'Limping preflop'], answer: 1, explanation: 'A donk bet is leading out-of-position into the preflop aggressor before they c-bet. It\'s often suboptimal but can be used strategically in certain spots.' },
  { q: 'What hand is Q♦J♦ on a board of K♣T♥9♠?', options: ['Two overcards', 'Gutshot straight draw', 'Open-ended straight draw', 'A made straight'], answer: 3, explanation: 'QJ on KT9: you already have Q-K-J-T-9? No — the board is K-T-9 and you hold Q-J. Together: K-Q-J-T-9 = made straight!' },
  { q: 'You have A♣J♣ on a board of K♣Q♣T♦. What is your hand?', options: ['Top pair only', 'Nut straight + nut flush draw', 'Flush draw only', 'Two overcards'], answer: 1, explanation: 'AJ on KQT: A-K-Q-J-T = Broadway (nut straight). A♣J♣ with K♣Q♣ on board = nut flush draw. This is a massive hand — always bet or raise.' },
  { q: 'What is the maximum number of players in standard Texas Hold\'em?', options: ['8', '9', '10', '12'], answer: 2, explanation: 'Standard Texas Hold\'em accommodates up to 10 players — 2 cards × 10 = 20 hole cards + 5 community = 25 cards minimum out of 52.' },
  { q: 'You have 99 on a board of 9♥5♦2♣ (you have top set). Best play?', options: ['Slowplay — too strong to bet', 'Bet for value and protection against draws', 'Check-raise only', 'Wait until the river to bet'], answer: 1, explanation: 'Top set on a dry board: bet for value and to charge any draws. Slowplaying can give free cards to straight/flush draws on later streets.' },
  { q: 'What does "protection betting" mean?', options: ['Betting to protect your stack', 'Betting to deny opponents free cards that could beat your leading hand', 'Folding to protect winnings', 'Raising to protect a draw'], answer: 1, explanation: 'Protection betting means betting to prevent free draws — charge opponents for cards that could improve them past your currently-best hand.' },
  { q: 'Villain raises every single hand preflop. Best counter-strategy?', options: ['3-bet very wide — catch them bluffing', 'Tighten up and only 3-bet value hands', 'Limp everything to trap them', 'Only play pots in position against them'], answer: 0, explanation: 'Against someone raising every hand, 3-betting wide is correct — they have a wide weak range and you gain position and initiative post-flop.' },
  { q: 'What is "leveling" in poker psychology?', options: ['Keeping track of bets', 'Thinking about what opponent thinks you think they have — meta-game thinking', 'Multi-street bluffing', 'Adjusting bet sizes'], answer: 1, explanation: 'Leveling is the meta-game of "what do they think I think?" Going too deep into levels backfires — stick to solid fundamentals and ranges.' },
  { q: 'When should you "auto-call" a very short stack shove?', options: ['Never — always calculate', 'When pot odds make calling correct with literally any two cards', 'Only with premium hands', 'Only if you\'re the big stack'], answer: 1, explanation: 'When a 2-3 BB stack shoves into a very large pot, pot odds can make any two cards a profitable call — you auto-profit on the math.' },
  { q: 'You have KK on a 7♦5♠2♥ board vs a single opponent who called your preflop raise. Best action?', options: ['Check — danger of slowplay trap', 'Bet for value — KK is a big overpair on this dry board', 'Fold — low boards are tricky', 'All-in immediately'], answer: 1, explanation: 'KK on a 7-5-2 rainbow board is a strong overpair on a dry texture. Bet for value — your range advantage is massive here.' },
  { q: 'What is "thin value betting"?', options: ['Betting with the absolute nuts', 'Betting a hand that barely beats opponent\'s calling range', 'Making small bets', 'Checking strong hands'], answer: 1, explanation: 'Thin value betting means you think you\'re ahead of enough of villain\'s calling range to bet for value, even if some better hands might call.' },
  { q: 'A "backdoor draw" requires:', options: ['A draw that completes on the back streets', 'Both the turn AND river to complete', 'Drawing to a hand in a secondary game', 'A flush draw that\'s behind'], answer: 1, explanation: 'A backdoor draw needs both the turn and river to complete. It adds ~3-4% equity but shouldn\'t be your primary reason to continue.' },
  { q: 'At what stack depth do small pocket pairs (22-66) lose the most value?', options: ['Very shallow (10-20 BB)', 'Medium (50-80 BB)', 'Very deep (200+ BB)', 'They never lose value'], answer: 0, explanation: 'Small pairs rely on implied odds to set-mine. At shallow depths, implied odds disappear — you can\'t win enough to justify calling and missing sets.' },
  { q: 'What is a "freeroll" in hand analysis?', options: ['A free tournament', 'You\'re tied with an opponent but have extra outs that can improve you to win more', 'Rolling for free', 'A free card opportunity'], answer: 1, explanation: 'A freeroll: you\'re tied now but have outs to improve and win the whole pot — getting extra equity for free (e.g., chopping now but can make a flush to win everything).' },
  { q: 'What does "check the nuts" violate in terms of table etiquette?', options: ['Nothing — it\'s a valid play', 'It\'s considered angle shooting — you should bet to give opponent a chance', 'It\'s illegal', 'It only matters in tournaments'], answer: 1, explanation: 'Checking back the nuts last-to-act on the river is considered poor etiquette (or angle shooting in some circles) — you deny opponents the ability to bluff-raise.' },
  { q: 'You have 2nd nut flush on the river. Villain shoves. You should:', options: ['Always call — 2nd nuts is very strong', 'Always fold — they always have the nuts', 'Evaluate: can villain have the nut flush, and do they bluff-shove here?', 'Re-shove to represent the nuts'], answer: 2, explanation: '2nd nut flush decisions require range analysis. Does villain shove the top flush? Can they be bluffing? Blockers and villain tendencies decide.' },
  { q: 'You check-call the flop and turn, then lead bet the river. This line typically means:', options: ['Weakness — pure bluff', 'You made your draw or have a strong made hand you\'re now going for value', 'Middle pair going for thin value', 'Random betting'], answer: 1, explanation: 'Check-call twice then lead river typically means you hit your draw (flush, straight) and are now betting for value rather than check-calling again.' },
  { q: 'What is the term for calling a large river bet even though you might be beaten, based on pot odds alone?', options: ['A hero call', 'A snap call', 'A value call', 'A pot-odds call'], answer: 0, explanation: 'A "hero call" is a call with a marginal hand against a large bet, often based on reads and pot odds. The best hero calls use logic; bad ones are gut-feel gambles.' },
]
