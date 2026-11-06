// XP, ranks, achievements and readiness, derived from saved progress.
import { RUBRIC_LABELS } from './rubric'

export function xpFrom(progress) {
  return progress.reduce((s, p) => s + p.bestScore * 10 + 50, 0)
}

const RANKS = [
  [0, 'Rookie'],
  [1500, 'Associate'],
  [3500, 'Closer'],
  [6000, 'Senior Closer'],
  [10000, 'Sales Champion'],
]
export function rankFor(xp) {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++
  const [floor, title] = RANKS[i]
  const next = RANKS[i + 1]
  return { title, floor, next: next?.[0] ?? null, nextTitle: next?.[1] ?? null }
}

export function achievementsFor({ progress, history, tier }) {
  const best = (lvl) => Math.max(0, ...progress.filter((p) => p.scenarioId === `level-${lvl}`).map((p) => p.bestScore))
  const byLevel = (lvl) => history.filter((h) => h.level === lvl).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const improved = [2, 3, 4].some((l) => {
    const h = byLevel(l)
    return h.length >= 2 && h.at(-1).score > h[0].score
  })
  const ethicsClean = history.some((h) => h.dims?.find((d) => d.id === 'ethics')?.score === 100)
  return [
    { id: 'first-pitch', icon: '🎤', title: 'First Pitch', text: 'Complete Level 1', earned: best(1) > 0 },
    { id: 'inbox', icon: '💬', title: 'Inbox Hero', text: 'Score 70+ in Level 2', earned: best(2) >= 70 },
    { id: 'voice', icon: '📞', title: 'On the Line', text: 'Finish a voice call in Level 3', earned: best(3) > 0 },
    { id: 'triage', icon: '🎯', title: 'Triage Master', text: 'Score 70+ in Level 4', earned: best(4) >= 70 },
    { id: 'honest', icon: '🛡️', title: 'Honest Seller', text: 'Perfect ethics score in a mission', earned: ethicsClean },
    { id: 'growth', icon: '📈', title: 'Growth Mindset', text: 'Beat your first score on a retry', earned: improved },
    { id: 'premium', icon: '💎', title: 'Premium Member', text: 'Unlock premium (demo)', earned: tier === 'premium' },
  ]
}

// Average of each rubric dimension across the latest attempt of every level.
export function readinessFrom(history) {
  const latest = {}
  for (const h of history) if (h.dims && (!latest[h.level] || h.createdAt > latest[h.level].createdAt)) latest[h.level] = h
  const rows = Object.values(latest)
  if (!rows.length) return null
  return RUBRIC_LABELS.map(({ id, label }) => {
    const vals = rows.map((r) => r.dims.find((d) => d.id === id)?.score).filter((v) => v != null)
    return { id, label, score: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 }
  })
}
