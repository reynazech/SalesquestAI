import express from 'express'
import { randomBytes } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { MISSIONS } from './content.js'
import { localizedPack, packs, packIdForProfile } from '../sim/content.js'
import { analyzeMessage, RUBRIC } from '../sim/engine.js'
import { userTier } from '../sim/routes.js'
import { formatMoney, isPremiumLevel } from '../../src/training/levels.js'

const HINT_COST = 2

function build(n, packId, region) {
  const pack = localizedPack(packId, region, formatMoney)
  const m = MISSIONS[n](pack, (usd) => formatMoney(usd, region))
  return { ...m, packId, region }
}

// Strip answers and checking rules before sending a mission to the browser.
function publicMission(m) {
  return {
    title: m.title,
    scene: m.scene,
    rules: m.rules,
    packId: m.packId,
    region: m.region,
    steps: m.steps.map((s) => {
      const { correct, explain, top, bottom, groups, need, ...rest } = s
      return { ...rest, ...(groups ? { checklist: groups.map((g) => g.label), need } : {}) }
    }),
  }
}

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v])

export function checkStep(step, answer) {
  switch (step.type) {
    case 'choose': {
      const picked = [...new Set(asArray(answer))]
      const want = step.pick || 1
      if (picked.length !== want) return { correct: false, score: 0, feedback: `Choose ${want === 1 ? 'one option' : `${want} options`}.` }
      const right = picked.filter((id) => step.correct.includes(id)).length
      const correct = right === step.correct.length
      return { correct, score: right / step.correct.length, feedback: correct ? step.explain : right ? 'Partly right. One choice isn’t the best fit.' : 'Not quite.' }
    }
    case 'rank': {
      const order = asArray(answer)
      const ids = step.items.map((i) => i.id)
      if (order.length !== ids.length || !ids.every((id) => order.includes(id))) return { correct: false, score: 0, feedback: 'Rank every item once.' }
      const topOk = asArray(step.top).includes(order[0])
      const bottomOk = asArray(step.bottom).includes(order.at(-1))
      const correct = topOk && bottomOk
      return { correct, score: (topOk + bottomOk) / 2, feedback: correct ? step.explain : !topOk ? 'Your first choice isn’t the highest priority.' : 'Look again at what belongs last.' }
    }
    case 'match': {
      const a = answer && typeof answer === 'object' ? answer : {}
      const keys = Object.keys(step.correct)
      if (!keys.every((k) => a[k])) return { correct: false, score: 0, feedback: 'Make a choice for every row.' }
      const right = keys.filter((k) => a[k] === step.correct[k])
      const correct = right.length === keys.length
      return { correct, score: right.length / keys.length, feedback: correct ? 'All matched correctly.' : `${right.length} of ${keys.length} correct.`, rows: Object.fromEntries(keys.map((k) => [k, a[k] === step.correct[k]])) }
    }
    case 'write': {
      const text = String(answer || '').trim().slice(0, 1200)
      if (text.split(/\s+/).filter(Boolean).length < 5) return { correct: false, score: 0, feedback: 'Write at least one full sentence.' }
      const a = analyzeMessage(text)
      if (a.pressure.length || a.falseClaims.length) {
        return { correct: false, score: 0, feedback: `Avoid pressure or unverifiable claims (“${[...a.pressure, ...a.falseClaims][0]}”).`, found: [] }
      }
      const found = step.groups.filter((g) => g.re.test(text)).map((g) => g.label)
      const correct = found.length >= step.need
      return { correct, score: Math.min(1, found.length / step.need), found, feedback: correct ? 'Nice. That covers the key ideas.' : `Add: ${step.groups.filter((g) => !found.includes(g.label)).map((g) => g.label.toLowerCase()).join(', ')}.` }
    }
    case 'calc': {
      const d = Number(answer?.discount)
      if (!Number.isFinite(d) || d < 0) return { correct: false, score: 0, feedback: 'Enter a discount (0 or more).' }
      if (d > step.maxDiscount) return { correct: false, score: 0, feedback: `${d}% is above your ${step.maxDiscount}% limit. That needs manager approval.` }
      const total = Math.round(step.unitPrice * step.quantity * (1 - d / 100))
      if (step.budget && total > step.budget) return { correct: false, score: 0.5, feedback: 'Still above the customer’s budget. Try a slightly bigger discount.' }
      return { correct: true, score: 1, feedback: d === 0 ? 'Full price and within budget. Great margin.' : `Offer of ${d}% is within your limit${step.budget ? ' and within budget' : ''}.` }
    }
    default:
      return { correct: false, score: 0, feedback: 'Unknown step' }
  }
}

function summarize(step, answer) {
  if (step.type === 'write') return `“${String(answer).slice(0, 140)}”`
  if (step.type === 'calc') return `${answer?.discount}% discount`
  if (step.type === 'match') return Object.entries(answer || {}).map(([k, v]) => `${step.left.find((l) => l.id === k)?.label}: ${v}`).join('; ')
  if (step.type === 'rank') return asArray(answer).map((id) => step.items.find((i) => i.id === id)?.label).join(' → ')
  return asArray(answer).map((id) => step.options.find((o) => o.id === id)?.label).join(', ')
}

export function createMissionRouter({ db, isAdmin }) {
  const r = express.Router()
  r.use(requireAuth)

  // Resolves level, access and pack for a request; sends an error and returns null if not allowed.
  function context(req, res) {
    const n = Number(req.params.n)
    if (!MISSIONS[n]) {
      res.status(404).json({ error: 'Mission not found' })
      return null
    }
    if (isPremiumLevel(n) && userTier(db, req.user.id).tier !== 'premium') {
      res.status(402).json({ error: 'Premium required', upgrade: true })
      return null
    }
    const row = req.user.active_profile_id ? db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(req.user.active_profile_id, req.user.id) : null
    if (!row?.complete) {
      res.status(409).json({ error: 'Complete your profile first', onboarding: true })
      return null
    }
    const profile = JSON.parse(row.data)
    let packId = packIdForProfile(profile)
    const override = req.query.industry || req.body?.industry
    if (override && packs[override]) {
      if (!isAdmin(req.user)) {
        res.status(403).json({ error: 'Industry preview is limited to demo admins' })
        return null
      }
      packId = override
    }
    return { n, profileId: row.id, mission: build(n, packId, profile.region) }
  }

  r.get('/:n', (req, res) => {
    const ctx = context(req, res)
    if (ctx) res.json({ level: ctx.n, ...publicMission(ctx.mission) })
  })

  r.post('/:n/check', (req, res) => {
    const ctx = context(req, res)
    if (!ctx) return
    const step = ctx.mission.steps.find((s) => s.id === req.body?.stepId)
    if (!step) return res.status(400).json({ error: 'Unknown step' })
    res.json(checkStep(step, req.body.answer))
  })

  // Scores every final answer on the server and saves the report.
  r.post('/:n/complete', (req, res) => {
    const ctx = context(req, res)
    if (!ctx) return
    const { mission, n } = ctx
    const answers = req.body?.answers || {}
    const hintsUsed = Math.max(0, Math.min(20, Number(req.body?.hintsUsed) || 0))
    const results = mission.steps.map((s) => ({ s, a: answers[s.id], r: checkStep(s, answers[s.id]) }))
    let score = Math.round((results.reduce((t, x) => t + x.r.score, 0) / results.length) * 100)
    score = Math.max(0, score - Math.min(10, hintsUsed * HINT_COST))

    const byDim = {}
    for (const { s, a, r: res2 } of results) {
      ;(byDim[s.dim] ||= { scores: [], evidence: [] }).scores.push(res2.score * 100)
      byDim[s.dim].evidence.push({ kind: res2.correct ? 'good' : 'gap', text: `${s.prompt} → ${summarize(s, a)}${s.explain && res2.correct ? `. ${s.explain}` : res2.correct ? '' : `. ${res2.feedback}`}` })
    }
    const dims = RUBRIC.filter((d) => byDim[d.id]).map((d) => ({ ...d, score: Math.round(byDim[d.id].scores.reduce((a, b) => a + b, 0) / byDim[d.id].scores.length), evidence: byDim[d.id].evidence }))
    const sorted = [...dims].sort((a, b) => b.score - a.score)
    const report = {
      score,
      dims,
      strengths: sorted.filter((d) => d.score >= 75).slice(0, 3).map((d) => d.label),
      improvements: sorted.filter((d) => d.score < 75).reverse().slice(0, 3).map((d) => d.label),
      outcome: score >= 85 ? 'Mission mastered' : score >= 60 ? 'Mission complete' : 'Mission complete: worth a retry',
      coachNote: hintsUsed ? `You used ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} (−${Math.min(10, hintsUsed * HINT_COST)} points). Try again without hints to beat your score.` : null,
      ruleBased: true,
    }
    const transcript = results.map(({ s, a, r: x }) => ({ from: 'player', text: `${s.prompt} → ${summarize(s, a)} ${x.correct ? '✓' : '✗'}`, at: Date.now() }))
    const id = randomBytes(9).toString('base64url')
    db.prepare(
      `INSERT INTO sim_sessions (id, user_id, profile_id, level, pack, status, state, transcript, report, score) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
    ).run(id, req.user.id, ctx.profileId, n, mission.packId, JSON.stringify({ region: mission.region, channel: mission.title, actions: [], hintsUsed }), JSON.stringify(transcript), JSON.stringify(report), score)
    db.prepare('INSERT INTO attempts (user_id, profile_id, scenario_id, score, outcome, choices) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, ctx.profileId, `level-${n}`, score, report.outcome, JSON.stringify([id]))
    db.prepare(
      `INSERT INTO progress (user_id, profile_key, scenario_id, best_score, attempts, completed) VALUES (?, ?, ?, ?, 1, 1)
       ON CONFLICT(user_id, profile_key, scenario_id) DO UPDATE SET best_score = max(best_score, excluded.best_score),
         attempts = attempts + 1, completed = 1, updated_at = datetime('now')`,
    ).run(req.user.id, ctx.profileId, `level-${n}`, score)
    res.status(201).json({ id, score })
  })

  return r
}
