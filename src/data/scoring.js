// Fixed, rule-based scoring for Level 1. No randomness, no AI.

const clamp = (n) => Math.max(0, Math.min(100, n))

export function applyChoice(meters, option) {
  return {
    trust: clamp(meters.trust + option.trust),
    patience: clamp(meters.patience + option.patience),
  }
}

export function totalScore(picks) {
  return picks.reduce((sum, p) => sum + p.score, 0)
}

export function rankFor(score) {
  if (score >= 90) return { title: 'Sales Natural', emoji: '🏆' }
  if (score >= 70) return { title: 'Rising Closer', emoji: '🚀' }
  if (score >= 50) return { title: 'Promising Rookie', emoji: '🌱' }
  return { title: 'Rookie Rep', emoji: '🎒' }
}

// Outcome depends on the total score AND the closing choice (Q5).
export function dealOutcome(score, picks, meters) {
  const securedNextStep = picks[4]?.key === 'B'
  if (securedNextStep && score >= 80) {
    return {
      tone: 'win',
      title: 'Demo booked — pilot on the table',
      text: 'Sarah agreed to a tailored demo on Thursday with a team lead, and is open to a two-week pilot.',
    }
  }
  if (securedNextStep) {
    return {
      tone: 'partial',
      title: 'Meeting booked — but trust is fragile',
      text: 'You secured a next step, but earlier missteps mean Sarah is still comparing you closely with TaskFlow.',
    }
  }
  if (score >= 55 && meters.patience > 10) {
    return {
      tone: 'stalled',
      title: 'Deal stalled — no committed next step',
      text: 'The conversation went reasonably well, but it ended without a dated next step. Momentum is likely to fade.',
    }
  }
  return {
    tone: 'lost',
    title: 'Deal lost — Sarah leans towards TaskFlow',
    text: 'Sarah did not see enough value to continue and is likely to go with the cheaper competitor.',
  }
}

const generalTips = [
  'Lead with the buyer’s problem, not your product’s features.',
  'Quantify pain in the buyer’s own words (hours, money, deadlines).',
  'End every call with a specific, agreed next step and date.',
  'Treat objections as requests for more information, not rejection.',
]

export function buildFeedback(picks) {
  const strengths = picks.filter((p) => p.good).map((p) => p.good).slice(0, 3)
  const improvements = picks
    .filter((p) => p.improve)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  const tips = [...new Set([...improvements.map((p) => p.tip), ...generalTips])].slice(0, 3)

  return {
    strengths: strengths.length
      ? strengths
      : ['You stayed in the conversation through all five decisions, even when Sarah pushed back.'],
    improvements: improvements.length
      ? improvements.map((p) => p.improve)
      : ['Near-perfect run. Next challenge: keep this quality with tougher buyers in future levels.'],
    tips,
  }
}
