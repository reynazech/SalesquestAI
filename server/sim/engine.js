// Deterministic simulation rules. The AI (or scripted fallback) only writes
// dialogue and proposes small state changes; everything that can be checked
// (prices, discounts, stock, CRM, scores) is decided here.

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))

const TOPICS = {
  need: /\b(need|needs|problem|challenge|looking for|why|use it|using|pain|issue|goal|purpose|what for|struggl|happening|situation|help you)\b/i,
  budget: /\b(budget|spend|price range|afford|invest|how much (are you|were you|do you)|range)\b/i,
  timeline: /\b(when|timeline|deadline|by when|how soon|date|move in|start|urgent|schedule|time ?frame|weeks?|months?)\b/i,
  decision: /\b(decide|decision|who else|approve|approval|sign[- ]?off|partner|husband|wife|team|boss|procurement|involved|cfo|together)\b/i,
  competitor: /\b(compar|other options?|alternative|competitor|elsewhere|looking at|considering|other (store|shop|vendor|supplier|agenc))\w*/i,
  productFit: /\b(size|spec|requirement|feature|integrat|capacity|how many|users|units|quantity|volume|flow|rooms?|bedrooms?|colou?r|dimension)\w*/i,
  intent: /\b(ready|plan to|planning|serious|buy|purchase|order|move forward|next step)\b/i,
}

// Pressure tactics and unverifiable claims. Never rewarded.
const PRESSURE = [
  /\bonly (today|now|this hour)\b/i,
  /\blast (one|chance|piece|unit|few)\b/i,
  /\bprices? (is |are )?(going|goes|will go) up\b/i,
  /\b(act|buy|decide) now\b/i,
  /\blimited[- ]time\b/i,
  /\byou('| wi)ll regret\b/i,
  /\beveryone (is buying|buys|has)\b/i,
  /\bselling (out )?fast\b/i,
]
const FALSE_CLAIMS = [
  /\bguarantee[sd]?\b/i,
  /\b100 ?% (sure|certain|guaranteed)\b/i,
  /\bbest in the (world|market|industry)\b/i,
  /\bno one else\b/i,
  /\bnever (breaks|fails)\b/i,
]
const EMPATHY = /\b(understand|makes sense|fair (point|question|enough)|i hear you|totally get|appreciate|sorry|good question|that's important|you're right)\b/i
const VALUE = /\b(save|saves|saving|hours|cost of|value|return|roi|because|which means|so that|benefit|warranty|tested|certif|datasheet|reviews?|case study|trial|pilot)\b/i
const NEXT_STEP = /\b(book|schedule|set up|arrange|meet|visit|viewing|demo|call|tour|trial|pilot|send (you|over)|quote|quotation|come (in|by|to|over)|drop by|pop in|showroom|test|site)\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|next week|\d{1,2}(:\d{2})?\s?(am|pm)|at \d)/i

export function analyzeMessage(text) {
  const t = String(text || '')
  const topics = Object.entries(TOPICS)
    .filter(([, re]) => re.test(t))
    .map(([k]) => k)
  const questions = (t.match(/\?/g) || []).length
  const openQuestion = /\b(what|how|why|tell me|walk me|which|describe|where)\b[^?]*\?/i.test(t)
  return {
    text: t,
    words: t.split(/\s+/).filter(Boolean).length,
    topics,
    questions,
    openQuestion,
    pressure: PRESSURE.filter((re) => re.test(t)).map((re) => t.match(re)[0]),
    falseClaims: FALSE_CLAIMS.filter((re) => re.test(t)).map((re) => t.match(re)[0]),
    empathy: EMPATHY.test(t),
    value: VALUE.test(t),
    nextStep: NEXT_STEP.test(t),
    mentionsPrice: /\b(price|cost|\$|aed|usd|inr|discount|cheaper|deal)\b/i.test(t),
  }
}

// Detects "only N left" style claims that contradict real stock.
export function scarcityCheck(text, pack) {
  const m = String(text).match(/\bonly (\d+|one|two|three) (left|remaining|in stock)\b/i)
  if (!m) return null
  const n = Number(m[1]) || { one: 1, two: 2, three: 3 }[m[1].toLowerCase()]
  const lowest = Math.min(...pack.products.filter((p) => p.stock != null).map((p) => p.stock))
  return n < lowest ? `Claimed "${m[0]}" but stock shows at least ${lowest}` : null
}

export function newCustomerState(level) {
  const base = { trust: 45, intent: 35, urgency: 40, budgetFlex: 50 }
  if (level === 3) Object.assign(base, { trust: 55, intent: 45 })
  return { ...base, revealed: [], objectionsRaised: [], objectionsResolved: [], mood: 'neutral', ended: false, agreedNextStep: null }
}

// Applies the turn: deterministic penalties first, then AI-proposed deltas (bounded).
export function applyTurn(state, analysis, proposal = {}, flags = []) {
  const s = { ...state }
  const bound = (v) => Math.max(-15, Math.min(15, Number(v) || 0))
  s.trust = clamp(s.trust + bound(proposal.trust_delta))
  s.intent = clamp(s.intent + bound(proposal.intent_delta))
  s.urgency = clamp(s.urgency + bound(proposal.urgency_delta))
  if (analysis.pressure.length || flags.length) {
    s.trust = clamp(s.trust - 12)
    s.intent = clamp(s.intent - 6)
  }
  if (analysis.falseClaims.length) s.trust = clamp(s.trust - 8)
  if (analysis.empathy) s.trust = clamp(s.trust + 3)
  s.mood = s.trust >= 70 ? 'warm' : s.trust >= 45 ? 'neutral' : s.trust >= 25 ? 'guarded' : 'annoyed'
  return s
}

// ---- Business tools (deterministic) ----

export function findProduct(pack, id) {
  return pack.products.find((p) => p.id === id) || null
}

export function checkAvailability(pack, productId, quantity = 1) {
  const p = findProduct(pack, productId)
  if (!p) return { ok: false, error: 'Unknown product' }
  if (p.stock == null) return { ok: true, product: p.name, available: true, note: `Subscription, onboarding in about ${p.leadDays} days.` }
  const enough = p.stock >= quantity
  return {
    ok: true,
    product: p.name,
    inStock: p.stock,
    available: enough,
    leadDays: p.leadDays,
    note: enough
      ? `${p.stock} in stock. Delivery or handover in about ${p.leadDays} days.`
      : `Only ${p.stock} in stock for ${quantity} requested. The rest ships in about ${p.leadDays + 21} days.`,
  }
}

export function buildQuote(pack, items, discountPct = 0) {
  if (!Array.isArray(items) || !items.length) return { ok: false, error: 'Add at least one line item' }
  const lines = []
  for (const { productId, quantity } of items) {
    const p = findProduct(pack, productId)
    const q = Math.floor(Number(quantity))
    if (!p) return { ok: false, error: `Unknown product ${productId}` }
    if (!(q >= 1 && q <= 10000)) return { ok: false, error: 'Quantity must be between 1 and 10,000' }
    lines.push({ productId: p.id, name: p.name, unitPrice: p.price, quantity: q, lineTotal: p.price * q, maxDiscountPct: p.maxDiscountPct })
  }
  const d = Number(discountPct) || 0
  const limit = Math.min(...lines.map((l) => l.maxDiscountPct))
  if (d < 0 || d > limit) {
    return { ok: false, error: `Discount ${d}% exceeds your approval limit of ${limit}% for these items.` }
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const total = Math.round(subtotal * (1 - d / 100) * 100) / 100
  return { ok: true, lines, discountPct: d, subtotal, total }
}

const CRM_FIELDS = ['need', 'budget', 'timeline', 'decision', 'nextStep', 'stage', 'notes']
const STAGES = ['new', 'contacted', 'qualified', 'nurture', 'unqualified', 'won', 'lost']

export function sanitizeCrm(input = {}) {
  const out = {}
  for (const k of CRM_FIELDS) {
    if (typeof input[k] === 'string') out[k] = input[k].trim().slice(0, 400)
  }
  if (out.stage && !STAGES.includes(out.stage)) delete out.stage
  return out
}

// ---- Lead intelligence (Level 4) ----

export const LEAD_WEIGHTS = { productFit: 25, need: 20, intent: 20, timeline: 15, decision: 10, engagement: 10 }

// Scores what the player has DISCOVERED, not the hidden truth.
export function scoreLead(lead, discovered) {
  let readiness = 0
  let evidence = 0
  for (const [dim, w] of Object.entries(LEAD_WEIGHTS)) {
    if (discovered.includes(dim)) {
      readiness += w * lead.dims[dim].v
      evidence += w
    } else {
      readiness += w * 0.3 // unknown dimensions assume weak evidence
    }
  }
  const confidence = evidence // weight-share with evidence, 0..100
  const valueFactor = Math.min(1, Math.log10(Math.max(lead.valueUsd, 10)) / 6)
  const priority = Math.round(readiness * (0.6 + 0.4 * valueFactor) * (0.5 + confidence / 200))
  return { readiness: Math.round(readiness), confidence, priority }
}

// ---- Coaching rubric ----

export const RUBRIC = [
  { id: 'understanding', label: 'Customer understanding' },
  { id: 'listening', label: 'Communication & listening' },
  { id: 'recommendation', label: 'Product recommendation' },
  { id: 'qualification', label: 'Lead qualification' },
  { id: 'objections', label: 'Objection handling' },
  { id: 'ethics', label: 'Ethical persuasion' },
  { id: 'workflow', label: 'Sales workflow execution' },
  { id: 'nextSteps', label: 'Next steps & outcome' },
]

const quote = (t) => `“${t.length > 140 ? t.slice(0, 137) + '…' : t}”`

// Evaluates a conversation-based mission (Levels 2 and 3) from transcript + actions.
export function evaluateConversation(session, pack) {
  const c = pack.customer
  const st = session.state.customer
  const playerMsgs = session.transcript.filter((m) => m.from === 'player')
  const analyses = playerMsgs.map((m) => ({ m, a: analyzeMessage(m.text) }))
  const actions = session.state.actions || []
  const crm = session.state.crm || {}
  const ev = {}
  const add = (k, kind, text) => (ev[k] ||= []).push({ kind, text })

  // Understanding: key facts revealed
  const keyFacts = ['need', 'budget', 'timeline', 'decision']
  const found = keyFacts.filter((f) => st.revealed.includes(f))
  const understanding = Math.round((found.length / keyFacts.length) * 85 + (st.revealed.includes('competitor') ? 15 : 0))
  found.forEach((f) => add('understanding', 'good', `Uncovered ${f}: ${quote(c.facts[f])}`))
  keyFacts.filter((f) => !found.includes(f)).forEach((f) => add('understanding', 'gap', `Never uncovered the customer’s ${f}.`))

  // Listening: open questions, talk ratio, no monologues
  const open = analyses.filter((x) => x.a.openQuestion)
  const longest = analyses.reduce((mx, x) => (x.a.words > (mx?.a.words || 0) ? x : mx), null)
  let listening = 40 + Math.min(40, open.length * 13)
  if (playerMsgs.length && playerMsgs.length < 2) listening -= 20
  if (longest && longest.a.words > 90) {
    listening -= 15
    add('listening', 'gap', `Long monologue (${longest.a.words} words): ${quote(longest.m.text)}`)
  }
  if (analyses.some((x) => x.a.empathy)) listening += 10
  open.slice(0, 2).forEach((x) => add('listening', 'good', `Open question: ${quote(x.m.text)}`))
  if (!open.length) add('listening', 'gap', 'No open questions (what / how / why) were asked.')

  // Recommendation
  const shared = actions.filter((a) => a.type === 'share_product').map((a) => a.productId)
  const ideal = shared.filter((id) => c.idealProducts.includes(id))
  const firstShare = actions.find((a) => a.type === 'share_product')
  const needKnownBefore = firstShare && st.revealedAt?.need != null && st.revealedAt.need <= firstShare.turn
  let recommendation = shared.length ? 35 : 15
  if (ideal.length) recommendation += 45
  if (needKnownBefore) recommendation += 20
  else if (firstShare) add('recommendation', 'gap', 'Shared a product before understanding the customer’s need.')
  shared.forEach((id) => {
    const p = findProduct(pack, id)
    add('recommendation', c.idealProducts.includes(id) ? 'good' : 'gap', `${c.idealProducts.includes(id) ? 'Recommended a strong fit' : 'Recommended a weaker fit'}: ${p?.name}`)
  })
  if (!shared.length) add('recommendation', 'gap', 'Never shared a specific product or option.')

  // Qualification: CRM fields consistent with discovered facts
  const crmChecks = keyFacts.filter((f) => (crm[f] || '').length >= 3)
  const crmBacked = crmChecks.filter((f) => st.revealed.includes(f))
  let qualification = Math.round((crmBacked.length / 4) * 70 + (crm.stage ? 15 : 0) + ((crm.notes || '').length > 20 ? 15 : 0))
  crmChecks.filter((f) => !st.revealed.includes(f)).forEach((f) => {
    qualification -= 10
    add('qualification', 'gap', `CRM “${f}” filled in without evidence from the customer: ${quote(crm[f])}`)
  })
  crmBacked.forEach((f) => add('qualification', 'good', `CRM ${f} recorded from evidence: ${quote(crm[f])}`))
  if (!crmChecks.length) add('qualification', 'gap', 'CRM qualification fields were left empty.')

  // Objections
  const raised = st.objectionsRaised
  const resolved = st.objectionsResolved
  let objections = raised.length ? Math.round((resolved.length / raised.length) * 100) : 60
  raised.forEach((id) => {
    const o = [...c.objections, c.callObjection].find((x) => x.id === id)
    add('objections', resolved.includes(id) ? 'good' : 'gap', `${resolved.includes(id) ? 'Handled' : 'Left unresolved'}: ${quote(o?.text || id)}`)
  })
  const discountFirst = analyses.find((x) => /\bdiscount|lower (the )?price|match (their|that) price\b/i.test(x.m.text))
  if (discountFirst && raised.includes('price')) {
    objections -= 10
    add('objections', 'gap', `Reached for price concessions: ${quote(discountFirst.m.text)}`)
  }

  // Ethics
  let ethics = 100
  for (const { m, a } of analyses) {
    if (a.pressure.length) {
      // Each distinct tactic in a message costs more.
      ethics -= 15 + 15 * a.pressure.length
      add('ethics', 'gap', `Pressure tactic (${a.pressure.join(', ')}): ${quote(m.text)}`)
    }
    if (a.falseClaims.length) {
      ethics -= 25
      add('ethics', 'gap', `Unverifiable claim: ${quote(m.text)}`)
    }
  }
  for (const f of session.state.flags || []) {
    ethics -= 30
    add('ethics', 'gap', f)
  }
  if (!ev.ethics) add('ethics', 'good', 'No pressure tactics, fake scarcity or unverifiable claims.')

  // Workflow
  const used = new Set(actions.map((a) => a.type))
  let workflow = 20
  if (used.has('check_availability')) (workflow += 25), add('workflow', 'good', 'Checked stock / availability before committing.')
  else add('workflow', 'gap', 'Did not check stock or availability.')
  if (used.has('crm_update')) (workflow += 25), add('workflow', 'good', 'Updated the CRM record.')
  if (used.has('share_product')) workflow += 15
  if (used.has('quote')) workflow += 15
  if (actions.some((a) => a.type === 'quote_rejected')) (workflow -= 10), add('workflow', 'gap', 'Tried a discount beyond the approval limit.')

  // Next steps
  const booked = actions.find((a) => a.type === 'book_next_step')
  let nextSteps = 15
  if (booked) {
    nextSteps = st.trust >= 50 ? 100 : 60
    add('nextSteps', st.trust >= 50 ? 'good' : 'gap', `Booked: ${booked.kind} on ${booked.when}${st.trust < 50 ? ' (customer was still unconvinced)' : ''}`)
  } else {
    const proposed = analyses.find((x) => x.a.nextStep)
    if (proposed) (nextSteps = 55), add('nextSteps', 'gap', `Proposed a next step but did not book it: ${quote(proposed.m.text)}`)
    else add('nextSteps', 'gap', 'Ended without a concrete, dated next step.')
  }

  const scores = { understanding, listening, recommendation, qualification, objections, ethics, workflow, nextSteps }
  return finalize(scores, ev, st)
}

function finalize(scores, ev, st = {}) {
  const dims = RUBRIC.map((r) => ({ ...r, score: clamp(scores[r.id] ?? 0), evidence: ev[r.id] || [] }))
  let total = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)
  // Ethics is a gate: manipulation caps the overall score.
  const ethics = dims.find((d) => d.id === 'ethics').score
  if (ethics < 60) total = Math.min(total, 55)
  const sorted = [...dims].sort((a, b) => b.score - a.score)
  return {
    score: total,
    dims,
    strengths: sorted.slice(0, 3).filter((d) => d.score >= 60).map((d) => d.label),
    improvements: sorted.slice(-3).reverse().filter((d) => d.score < 75).map((d) => d.label),
    outcome: outcomeFor(total, st),
  }
}

function outcomeFor(score, st) {
  if (st.agreedNextStep && score >= 70) return 'Next step agreed with an engaged customer'
  if (st.agreedNextStep) return 'Next step booked, but the customer is still unsure'
  if (score >= 60) return 'Positive conversation, no committed next step'
  return 'Customer disengaged'
}

// Level 4: evidence-based triage evaluation (no fixed correct ranking).
export function evaluateTriage(session, pack) {
  const st = session.state
  const ev = {}
  const add = (k, kind, text) => (ev[k] ||= []).push({ kind, text })
  const leads = pack.leads
  const scored = leads.map((l) => ({ l, s: scoreLead(l, st.discovered[l.id] || []) }))
  const avgConf = scored.reduce((a, x) => a + x.s.confidence, 0) / leads.length
  const ranking = st.ranking || leads.map((l) => l.id)
  const gem = leads.find((l) => l.gem)
  const gemFound = (st.discovered[gem.id] || []).some((d) => ['need', 'productFit'].includes(d))
  const gemRank = ranking.indexOf(gem.id)

  // Consistency between the player's ranking and the evidence they gathered.
  const byPriority = [...scored].sort((a, b) => b.s.priority - a.s.priority).map((x) => x.l.id)
  const n = leads.length
  const d2 = ranking.reduce((s, id, i) => s + (i - byPriority.indexOf(id)) ** 2, 0)
  const spearman = 1 - (6 * d2) / (n * (n * n - 1))

  const understanding = clamp(avgConf)
  add('understanding', avgConf >= 50 ? 'good' : 'gap', `Average evidence confidence across leads: ${Math.round(avgConf)}%`)
  const qualification = clamp(40 + spearman * 60)
  add('qualification', spearman >= 0.5 ? 'good' : 'gap', `Ranking ${spearman >= 0.5 ? 'matches' : 'does not match'} the evidence you collected (consistency ${Math.round(spearman * 100)}%).`)
  scored
    .filter((x) => ranking.indexOf(x.l.id) <= 1 && x.s.confidence < 40)
    .forEach((x) => add('qualification', 'gap', `Ranked ${x.l.name} in the top two with only ${x.s.confidence}% evidence.`))

  let recommendation = gemFound ? (gemRank <= 1 ? 100 : 60) : 30
  add('recommendation', gemFound ? 'good' : 'gap', gemFound ? `Uncovered the hidden opportunity behind “${gem.source}”${gemRank <= 1 ? ' and prioritised it.' : ', but ranked it low.'}` : `Missed the large opportunity hidden behind a low-information lead (${gem.name}).`)

  const msgs = session.transcript.filter((m) => m.from === 'player')
  const open = msgs.filter((m) => analyzeMessage(m.text).openQuestion)
  const listening = clamp(40 + open.length * 10)
  open.slice(0, 2).forEach((m) => add('listening', 'good', `Good probing question to ${m.leadName}: ${quote(m.text)}`))

  const just = st.justification || ''
  const dimWords = /(fit|need|intent|timeline|decision|engagement|budget|evidence|value|urgent|confidence)/gi
  const jHits = new Set((just.match(dimWords) || []).map((w) => w.toLowerCase())).size
  const reply = st.managerReply || ''
  const rHits = new Set((reply.match(dimWords) || []).map((w) => w.toLowerCase())).size
  const objections = clamp(30 + rHits * 15 + (/(verify|confirm|ask|call|check|find out)/i.test(reply) ? 20 : 0))
  if (reply) add('objections', rHits ? 'good' : 'gap', `Response to manager: ${quote(reply)}`)
  else add('objections', 'gap', 'Did not answer the manager’s challenge.')

  const workflow = clamp(30 + Object.keys(st.crm || {}).length * 14)
  add('workflow', 'good', `${Object.keys(st.crm || {}).length} of ${n} leads given a CRM stage.`)

  const nextSteps = clamp(jHits * 15 + (just.length > 60 ? 25 : 0))
  add('nextSteps', jHits ? 'good' : 'gap', just ? `Justification: ${quote(just)}` : 'No written justification for the ranking.')

  let ethics = 100
  for (const m of msgs) {
    const a = analyzeMessage(m.text)
    if (a.pressure.length || a.falseClaims.length) (ethics -= 30), add('ethics', 'gap', `To ${m.leadName}: ${quote(m.text)}`)
  }
  if (!ev.ethics) add('ethics', 'good', 'Kept outreach honest and pressure-free.')

  const res = finalize({ understanding, listening, recommendation, qualification, objections, ethics, workflow, nextSteps }, ev, {})
  res.outcome = gemFound && gemRank <= 1 ? 'Major opportunity identified and prioritised' : res.score >= 60 ? 'Solid triage with gaps' : 'Pipeline priorities unclear'
  res.leadTable = scored.map((x) => ({ id: x.l.id, name: x.l.name, ...x.s, rank: ranking.indexOf(x.l.id) + 1 }))
  return res
}
