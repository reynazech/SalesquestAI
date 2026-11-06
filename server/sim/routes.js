import express from 'express'
import { randomBytes } from 'node:crypto'
import { packs, packIdForProfile, localizedPack } from './content.js'
import { inboxChannel } from '../../src/training/packs.js'
import {
  analyzeMessage,
  scarcityCheck,
  newCustomerState,
  applyTurn,
  findProduct,
  checkAvailability,
  buildQuote,
  sanitizeCrm,
  scoreLead,
  evaluateConversation,
  evaluateTriage,
} from './engine.js'
import { customerReply, leadReply, managerChallenge, coachNarrative, aiEnabled } from './customer.js'
import { getLevel, isPremiumLevel, missionCopy, formatMoney } from '../../src/training/levels.js'
import { requireAuth } from '../auth.js'

const SIM_LEVELS = [2, 3, 4]
const MAX_TURNS = 40
const L4_CONTACTS = 8
const L4_RESEARCH = 2

export function userTier(db, userId) {
  const row = db
    .prepare(
      `SELECT tier, source FROM entitlements WHERE user_id = ? AND tier = 'premium'
       AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY granted_at DESC LIMIT 1`,
    )
    .get(userId)
  return row ? { tier: 'premium', source: row.source } : { tier: 'free', source: null }
}

export function createSimRouter({ db, isAdmin }) {
  const r = express.Router()
  r.use(requireAuth)

  const load = db.prepare('SELECT * FROM sim_sessions WHERE id = ? AND user_id = ?')
  const save = db.prepare(`UPDATE sim_sessions SET state = ?, transcript = ?, status = ?, report = ?, score = ?, updated_at = datetime('now') WHERE id = ?`)

  const hydrate = (row) => ({ ...row, state: JSON.parse(row.state), transcript: JSON.parse(row.transcript), report: row.report ? JSON.parse(row.report) : null })
  const persist = (s) => save.run(JSON.stringify(s.state), JSON.stringify(s.transcript), s.status, s.report ? JSON.stringify(s.report) : null, s.score ?? null, s.id)

  function getSession(req, res) {
    const row = load.get(req.params.id, req.user.id)
    if (!row) {
      res.status(404).json({ error: 'Mission not found' })
      return null
    }
    const s = hydrate(row)
    // Premium is re-checked on every request, not only at start.
    if (isPremiumLevel(s.level) && userTier(db, req.user.id).tier !== 'premium') {
      res.status(402).json({ error: 'Premium required', upgrade: true })
      return null
    }
    return s
  }

  const ensureActive = (s, res) => {
    if (s.status !== 'active') {
      res.status(409).json({ error: 'This mission has finished. Start a new attempt to play again.' })
      return false
    }
    return true
  }

  // Public view: hidden motivations and undiscovered facts never leave the server.
  function view(s) {
    const pack = localizedPack(s.pack, s.state.region, formatMoney)
    const region = s.state.region
    const base = {
      id: s.id,
      level: s.level,
      status: s.status,
      mission: missionCopy(s.level, s.pack),
      engine: aiEnabled() ? 'claude' : 'scripted',
      pack: { id: pack.id, label: pack.label, seller: pack.seller, terminology: pack.terminology, nextStepTypes: pack.nextStepTypes },
      channel: s.state.channel,
      region,
      products: pack.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit || null, specs: p.specs, priceLabel: formatMoney(p.price, region) + (p.unit ? ` / ${p.unit}` : ''), maxDiscountPct: p.maxDiscountPct })),
      transcript: s.transcript,
      actions: s.state.actions,
      report: s.report,
      industryOverride: s.state.industryOverride || null,
    }
    if (s.level === 4) {
      const st = s.state
      return {
        ...base,
        contactsLeft: st.contactsLeft,
        researchLeft: st.researchLeft,
        phase: st.phase,
        ranking: st.ranking,
        crm: st.crm,
        justification: st.justification,
        manager: st.manager,
        leads: pack.leads.map((l) => {
          const disc = st.discovered[l.id] || []
          return {
            id: l.id,
            name: l.name,
            company: l.company,
            source: l.source,
            profile: l.profile,
            valueLabel: st.valueKnown?.includes(l.id) ? formatMoney(l.valueUsd, region) : 'Unknown',
            evidence: disc.map((d) => ({ dim: d, fact: l.dims[d].fact })),
            ...scoreLead(l, disc),
          }
        }),
      }
    }
    const c = pack.customer
    return {
      ...base,
      customer: { name: c.name, handle: c.handle, role: c.role },
      meters: { trust: s.state.customer.trust, intent: s.state.customer.intent, urgency: s.state.customer.urgency, mood: s.state.customer.mood },
      crm: s.state.crm,
      notes: s.state.notes || '',
      memory: s.state.memorySummary || null,
      agreedNextStep: s.state.customer.agreedNextStep,
      turnsLeft: MAX_TURNS - s.transcript.filter((m) => m.from === 'player').length,
    }
  }

  // ---- Start ----
  r.post('/start', (req, res) => {
    const level = Number(req.body?.level)
    const def = getLevel(level)
    if (!def || !SIM_LEVELS.includes(level) || def.status !== 'playable') return res.status(404).json({ error: 'This level is not playable yet' })
    if (isPremiumLevel(level) && userTier(db, req.user.id).tier !== 'premium') {
      return res.status(402).json({ error: 'Premium required', upgrade: true })
    }
    const profileRow = req.user.active_profile_id
      ? db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(req.user.active_profile_id, req.user.id)
      : null
    if (!profileRow || !profileRow.complete) return res.status(409).json({ error: 'Complete your profile first', onboarding: true })
    const profile = JSON.parse(profileRow.data)

    // Demo-only industry switcher: admins can preview other packs without touching any profile.
    let packId = packIdForProfile(profile)
    const override = req.body?.industryOverride
    if (override && packs[override]) {
      if (!isAdmin(req.user)) return res.status(403).json({ error: 'Industry preview is limited to demo admins' })
      packId = override
    }
    const pack = localizedPack(packId, profile.region, formatMoney)
    const id = randomBytes(9).toString('base64url')
    const state = { region: profile.region, channel: '', actions: [], flags: [], industryOverride: override && packs[override] ? override : null }
    const transcript = []

    if (level === 4) {
      Object.assign(state, {
        channel: 'Lead command center',
        contactsLeft: L4_CONTACTS,
        researchLeft: L4_RESEARCH,
        phase: 'investigate',
        discovered: Object.fromEntries(pack.leads.map((l) => [l.id, [...l.known]])),
        valueKnown: [],
        ranking: pack.leads.map((l) => l.id),
        crm: {},
      })
    } else {
      const c = pack.customer
      state.customer = newCustomerState(level)
      state.customer.revealedAt = {}
      state.crm = {}
      if (level === 2) {
        state.channel = inboxChannel(packId, profile)
        transcript.push({ from: 'customer', text: c.opening, at: Date.now() })
      } else {
        state.channel = pack.call
        const prev = db
          .prepare(`SELECT state, transcript FROM sim_sessions WHERE user_id = ? AND level = 2 AND pack = ? ORDER BY updated_at DESC LIMIT 1`)
          .get(req.user.id, packId)
        if (prev) {
          const ps = JSON.parse(prev.state)
          const shared = ps.actions.filter((a) => a.type === 'share_product').map((a) => findProduct(pack, a.productId)?.name)
          const facts = ps.customer.revealed.map((f) => c.facts[f])
          state.memorySummary = [
            shared.length ? `The seller recommended: ${[...new Set(shared)].join(', ')}.` : 'The seller did not recommend a specific product.',
            facts.length ? `You told them: ${facts.join(' ')}` : 'You shared little about yourself.',
            ps.customer.agreedNextStep ? `You agreed to: ${ps.customer.agreedNextStep}.` : '',
            `You ended that chat feeling ${ps.customer.mood}.`,
          ]
            .filter(Boolean)
            .join(' ')
          // Carry over what was learned and how the relationship felt.
          state.customer.revealed = [...ps.customer.revealed]
          state.customer.trust = Math.round((ps.customer.trust + 55) / 2)
          state.crm = { ...ps.crm }
        }
        transcript.push({ from: 'system', text: c.callGoal, at: Date.now() })
      }
    }

    db.prepare(
      `INSERT INTO sim_sessions (id, user_id, profile_id, level, pack, status, state, transcript) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).run(id, req.user.id, profileRow.id, level, packId, JSON.stringify(state), JSON.stringify(transcript))
    res.status(201).json(view(hydrate(load.get(id, req.user.id))))
  })

  r.get('/history', (req, res) => {
    const level = Number(req.query.level)
    const rows = db
      .prepare(
        `SELECT id, level, pack, status, score, report, created_at FROM sim_sessions
         WHERE user_id = ? AND status = 'completed' ${level ? 'AND level = ?' : ''} ORDER BY created_at DESC LIMIT 20`,
      )
      .all(...(level ? [req.user.id, level] : [req.user.id]))
    res.json(
      rows.map((r) => {
        const rep = r.report ? JSON.parse(r.report) : null
        return { id: r.id, level: r.level, pack: r.pack, score: r.score, createdAt: r.created_at, outcome: rep?.outcome, dims: rep?.dims?.map((d) => ({ id: d.id, label: d.label, score: d.score })) }
      }),
    )
  })

  r.get('/:id', (req, res) => {
    const s = getSession(req, res)
    if (s) res.json(view(s))
  })

  // ---- Conversation turn (Levels 2-3) ----
  async function customerTurn(s, ctxExtra) {
    const pack = localizedPack(s.pack, s.state.region, formatMoney)
    const c = pack.customer
    const st = s.state.customer
    const objections = s.level === 3 ? [c.callObjection, ...c.objections] : c.objections
    const out = await customerReply({
      pack,
      persona: c,
      channel: s.state.channel,
      level: s.level,
      state: st,
      memory: s.state.memorySummary,
      objections,
      history: s.transcript,
      ...ctxExtra,
    })
    const turn = s.transcript.filter((m) => m.from === 'player').length
    const next = applyTurn(st, ctxExtra.analysis || analyzeMessage(''), out, ctxExtra.flags || [])
    const validFacts = Object.keys(c.facts)
    for (const f of out.revealed || []) {
      if (validFacts.includes(f) && !next.revealed.includes(f)) {
        next.revealed.push(f)
        next.revealedAt = { ...next.revealedAt, [f]: turn }
      }
    }
    const ids = objections.map((o) => o.id)
    if (ids.includes(out.raised_objection) && !next.objectionsRaised.includes(out.raised_objection)) next.objectionsRaised.push(out.raised_objection)
    if (next.objectionsRaised.includes(out.resolved_objection) && !next.objectionsResolved.includes(out.resolved_objection)) next.objectionsResolved.push(out.resolved_objection)
    if (out.agrees_to_next_step && ctxExtra.analysis?.nextStep) next.agreedNextStep = ctxExtra.analysis.text.slice(0, 160)
    s.state.customer = next
    s.transcript.push({ from: 'customer', text: out.reply, engine: out.engine, at: Date.now() })
    return out
  }

  r.post('/:id/message', async (req, res) => {
    const s = getSession(req, res)
    if (!s || !ensureActive(s, res)) return
    if (s.level === 4) return res.status(400).json({ error: 'Use lead messages in this level' })
    const text = String(req.body?.text || '').trim().slice(0, 1200)
    if (!text) return res.status(400).json({ error: 'Message is empty' })
    if (s.transcript.filter((m) => m.from === 'player').length >= MAX_TURNS) return res.status(409).json({ error: 'Turn limit reached. Finish the mission.' })
    const analysis = analyzeMessage(text)
    const flags = []
    const scarcity = scarcityCheck(text, localizedPack(s.pack, s.state.region, formatMoney))
    if (scarcity) flags.push(`False scarcity: ${scarcity}`)
    s.state.flags.push(...flags)
    s.transcript.push({ from: 'player', text, voice: !!req.body?.voice, at: Date.now() })
    await customerTurn(s, { analysis, flags })
    persist(s)
    res.json(view(s))
  })

  // ---- Tool actions ----
  r.post('/:id/action', async (req, res) => {
    const s = getSession(req, res)
    if (!s || !ensureActive(s, res)) return
    const pack = localizedPack(s.pack, s.state.region, formatMoney)
    const { type } = req.body || {}
    const turn = s.transcript.filter((m) => m.from === 'player').length
    const st = s.state
    const region = st.region

    if (s.level === 4) return triageAction(s, req, res, pack)

    switch (type) {
      case 'share_product': {
        const p = findProduct(pack, req.body.productId)
        if (!p) return res.status(400).json({ error: 'Unknown product' })
        st.actions.push({ type, productId: p.id, turn })
        s.transcript.push({ from: 'player', kind: 'product', productId: p.id, text: `[Product card: ${p.name}, ${formatMoney(p.price, region)}${p.unit ? ' / ' + p.unit : ''}. ${p.specs.join(', ')}]`, at: Date.now() })
        await customerTurn(s, { event: { type, productId: p.id } })
        break
      }
      case 'check_availability': {
        const result = checkAvailability(pack, req.body.productId, Number(req.body.quantity) || 1)
        if (!result.ok) return res.status(400).json({ error: result.error })
        st.actions.push({ type, productId: req.body.productId, turn })
        s.transcript.push({ from: 'tool', text: `Availability · ${result.product}: ${result.note}`, at: Date.now() })
        break
      }
      case 'quote': {
        const q = buildQuote(pack, req.body.items, req.body.discountPct)
        if (!q.ok) {
          st.actions.push({ type: 'quote_rejected', reason: q.error, turn })
          s.transcript.push({ from: 'tool', text: `Quote blocked · ${q.error}`, at: Date.now() })
          persist(s)
          return res.status(422).json({ error: q.error, session: view(s) })
        }
        const totalLabel = formatMoney(q.total, region)
        st.actions.push({ type, total: q.total, discountPct: q.discountPct, turn })
        s.transcript.push({ from: 'player', kind: 'quote', text: `[Quote: ${q.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')}${q.discountPct ? `, ${q.discountPct}% discount` : ''}. Total ${totalLabel}]`, at: Date.now() })
        await customerTurn(s, { event: { type, totalLabel } })
        break
      }
      case 'crm_update': {
        st.crm = { ...st.crm, ...sanitizeCrm(req.body.crm) }
        st.actions.push({ type, turn })
        break
      }
      case 'note': {
        st.notes = String(req.body.text || '').slice(0, 2000)
        break
      }
      case 'book_next_step': {
        const kind = String(req.body.kind || '')
        const when = String(req.body.when || '').slice(0, 40)
        if (!pack.nextStepTypes.includes(kind) || !when) return res.status(400).json({ error: 'Choose a next step type and a date/time' })
        const c = st.customer
        if (!c.agreedNextStep && c.trust < 55) {
          s.transcript.push({ from: 'customer', text: 'I’m not ready to put that in the calendar yet.', at: Date.now() })
          st.actions.push({ type: 'book_declined', kind, when, turn })
          break
        }
        c.agreedNextStep = c.agreedNextStep || `${kind} on ${when}`
        st.actions.push({ type, kind, when, turn })
        st.crm = { ...st.crm, nextStep: `${kind} — ${when}` }
        s.transcript.push({ from: 'tool', text: `Calendar · ${kind} booked for ${when}. Invitation sent.`, at: Date.now() })
        break
      }
      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
    persist(s)
    res.json(view(s))
  })

  async function triageAction(s, req, res, pack) {
    const st = s.state
    const { type } = req.body || {}
    const lead = pack.leads.find((l) => l.id === req.body.leadId)
    switch (type) {
      case 'research': {
        if (!lead) return res.status(400).json({ error: 'Unknown lead' })
        if (st.researchLeft <= 0) return res.status(409).json({ error: 'No research time left today' })
        st.researchLeft -= 1
        st.discovered[lead.id] = [...new Set([...st.discovered[lead.id], 'productFit'])]
        st.valueKnown = [...new Set([...st.valueKnown, lead.id])]
        s.transcript.push({ from: 'tool', leadId: lead.id, leadName: lead.name, text: `Research · ${lead.name}: ${lead.dims.productFit.fact} Estimated value recorded.`, at: Date.now() })
        break
      }
      case 'message': {
        if (!lead) return res.status(400).json({ error: 'Unknown lead' })
        if (st.phase !== 'investigate') return res.status(409).json({ error: 'Investigation is closed' })
        if (st.contactsLeft <= 0) return res.status(409).json({ error: 'No contacts left. Rank your leads.' })
        const text = String(req.body.text || '').trim().slice(0, 800)
        if (!text) return res.status(400).json({ error: 'Message is empty' })
        st.contactsLeft -= 1
        const a = analyzeMessage(text)
        s.transcript.push({ from: 'player', leadId: lead.id, leadName: lead.name, text, at: Date.now() })
        const out = await leadReply({ pack, lead, asked: a.topics.map((t) => (t === 'budget' ? 'intent' : t)), alreadyKnown: st.discovered[lead.id], question: text })
        st.discovered[lead.id] = [...new Set([...st.discovered[lead.id], ...out.revealed, 'engagement'])]
        if (out.revealed.includes('need')) st.valueKnown = [...new Set([...st.valueKnown, lead.id])]
        s.transcript.push({ from: 'customer', leadId: lead.id, leadName: lead.name, text: out.reply, engine: out.engine, at: Date.now() })
        break
      }
      case 'crm_stage': {
        if (!lead) return res.status(400).json({ error: 'Unknown lead' })
        const stage = sanitizeCrm({ stage: req.body.stage }).stage
        if (!stage) return res.status(400).json({ error: 'Invalid stage' })
        st.crm[lead.id] = stage
        break
      }
      case 'rank': {
        const ids = pack.leads.map((l) => l.id)
        const ranking = req.body.ranking
        if (!Array.isArray(ranking) || ranking.length !== ids.length || !ids.every((id) => ranking.includes(id))) {
          return res.status(400).json({ error: 'Ranking must include every lead once' })
        }
        st.ranking = ranking
        break
      }
      case 'submit': {
        if (st.phase !== 'investigate') return res.status(409).json({ error: 'Already submitted' })
        st.justification = String(req.body.justification || '').slice(0, 1500)
        const table = pack.leads.map((l) => ({ id: l.id, name: l.name, ...scoreLead(l, st.discovered[l.id]) }))
        st.manager = await managerChallenge({ pack, ranking: st.ranking, table, justification: st.justification })
        st.phase = 'challenge'
        s.transcript.push({ from: 'manager', text: st.manager.text, engine: st.manager.engine, at: Date.now() })
        break
      }
      case 'manager_reply': {
        if (st.phase !== 'challenge') return res.status(409).json({ error: 'No open challenge' })
        st.managerReply = String(req.body.text || '').slice(0, 1500)
        s.transcript.push({ from: 'player', leadName: 'Manager', text: st.managerReply, at: Date.now() })
        st.phase = 'ready'
        break
      }
      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
    persist(s)
    res.json(view(s))
  }

  // ---- Finish & coaching ----
  r.post('/:id/finish', async (req, res) => {
    const s = getSession(req, res)
    if (!s) return
    if (s.status === 'completed') return res.json(view(s))
    const pack = localizedPack(s.pack, s.state.region, formatMoney)
    if (s.level === 4 && s.state.phase !== 'ready') return res.status(409).json({ error: 'Submit your ranking and answer your manager first' })
    if (s.level !== 4 && s.transcript.filter((m) => m.from === 'player').length < 2) {
      return res.status(409).json({ error: 'Have a real conversation first (at least two messages)' })
    }
    const evaluation = s.level === 4 ? evaluateTriage(s, pack) : evaluateConversation(s, pack)
    evaluation.coachNote = await coachNarrative({ evaluation, transcript: s.transcript })
    evaluation.ruleBased = true
    s.report = evaluation
    s.score = evaluation.score
    s.status = 'completed'
    persist(s)
    const scenarioId = `level-${s.level}`
    db.prepare('INSERT INTO attempts (user_id, profile_id, scenario_id, score, outcome, choices) VALUES (?, ?, ?, ?, ?, ?)').run(
      req.user.id,
      s.profile_id,
      scenarioId,
      evaluation.score,
      evaluation.outcome,
      JSON.stringify([s.id]),
    )
    db.prepare(
      `INSERT INTO progress (user_id, profile_key, scenario_id, best_score, attempts, completed) VALUES (?, ?, ?, ?, 1, 1)
       ON CONFLICT(user_id, profile_key, scenario_id) DO UPDATE SET best_score = max(best_score, excluded.best_score),
         attempts = attempts + 1, completed = 1, updated_at = datetime('now')`,
    ).run(req.user.id, s.profile_id ?? 0, scenarioId, evaluation.score)
    res.json(view(s))
  })

  return r
}
