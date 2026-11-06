import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../server/db.js'
import { createApp } from '../server/app.js'

// End-to-end API tests against an in-memory database. ANTHROPIC_API_KEY is
// cleared so the deterministic scripted customer is used.
delete process.env.ANTHROPIC_API_KEY

let server, base
before(async () => {
  const db = openDb(':memory:')
  const app = createApp({
    db,
    googleClientId: 'test-client-id.apps.googleusercontent.com',
    devLogin: true,
    verifyGoogle: async (cred) => {
      if (cred !== 'valid-google-token') throw new Error('bad token')
      return { sub: 'google-123', email: 'reyna@example.test', name: 'Reyna', picture: null }
    },
  })
  await new Promise((r) => (server = app.listen(0, r)))
  base = `http://localhost:${server.address().port}/api`
})
after(() => server.close())

function client() {
  let cookie = ''
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0]
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null
    return { status: res.status, data }
  }
}

const profile = (industry, extra = {}) => ({
  careerStatus: 'professional',
  industry,
  market: 'b2c',
  role: 'Sales associate',
  companyType: 'sme',
  products: 'Furniture',
  typicalCustomer: 'Young families',
  channels: ['social', 'in_person'],
  experience: 'junior',
  region: 'United Arab Emirates',
  language: 'English',
  skills: ['discovery', 'objections'],
  ...extra,
})

test('Google sign-in verifies the token and creates a persistent session', async () => {
  const c = client()
  assert.equal((await c('POST', '/auth/google', { credential: 'forged' })).status, 401)
  assert.equal((await c('POST', '/auth/google', { credential: 'valid-google-token' })).status, 200)
  const me = await c('GET', '/me')
  assert.equal(me.data.user.email, 'reyna@example.test')
  assert.equal(me.data.needsOnboarding, true)
  assert.equal(me.data.tier, 'free')
  await c('POST', '/auth/logout')
  assert.equal((await c('GET', '/me')).data.user, null)
})

test('protected APIs reject anonymous requests', async () => {
  const c = client()
  for (const [m, p] of [['GET', '/attempts'], ['POST', '/profiles'], ['POST', '/sim/start'], ['GET', '/billing/orders']]) {
    assert.equal((await c(m, p, {})).status, 401, `${m} ${p}`)
  }
})

test('onboarding profile persists across logout/login; switching keeps attempts', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'persist@example.test' })
  const incomplete = await c('POST', '/profiles', { profile: { industry: 'retail' } })
  assert.equal(incomplete.data.complete, false)
  const p1 = await c('PUT', `/profiles/${incomplete.data.id}`, { profile: profile('retail') })
  assert.equal(p1.data.complete, true)
  assert.equal((await c('POST', '/attempts', { scenarioId: 'level-1', profileId: p1.data.id, score: 72, outcome: 'Demo booked' })).status, 201)

  await c('POST', '/auth/logout')
  await c('POST', '/auth/dev', { email: 'persist@example.test' })
  let me = (await c('GET', '/me')).data
  assert.equal(me.needsOnboarding, false)
  assert.equal(me.activeProfile.profile.industry, 'retail')

  const p2 = await c('POST', '/profiles', { profile: profile('saas', { market: 'b2b' }) })
  me = (await c('GET', '/me')).data
  assert.equal(me.activeProfile.id, p2.data.id)
  assert.equal(me.profiles.length, 2)
  assert.equal(me.profiles.find((p) => p.id === p1.data.id).attempts, 1)
  assert.equal((await c('GET', '/attempts')).data.length, 1)
})

test('Level 2 inbox: free-text chat, validated tools, CRM and evidence-based report', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'l2@example.test' })
  await c('POST', '/profiles', { profile: profile('retail') })
  const s = (await c('POST', '/sim/start', { level: 2 })).data
  assert.equal(s.channel, 'Instagram DMs')
  assert.equal(s.customer.name, 'Maya Rahman')
  assert.ok(!JSON.stringify(s).includes('hiddenMotivation'), 'hidden motivation must not leak')
  assert.ok(!JSON.stringify(s).includes('parents stay over'), 'undiscovered facts must not leak')

  let v = (await c('POST', `/sim/${s.id}/message`, { text: 'Hi Maya! Yes it is. What will you mostly use the sofa for, and when do you move in?' })).data
  assert.ok(v.transcript.at(-1).text.length > 0)
  v = (await c('POST', `/sim/${s.id}/message`, { text: 'Who else is involved in choosing it, and what budget range feels comfortable?' })).data
  assert.equal((await c('POST', `/sim/${s.id}/action`, { type: 'check_availability', productId: 'haven-sofabed' })).status, 200)
  assert.equal((await c('POST', `/sim/${s.id}/action`, { type: 'share_product', productId: 'nope' })).status, 400)
  assert.equal((await c('POST', `/sim/${s.id}/action`, { type: 'share_product', productId: 'haven-sofabed' })).status, 200)
  const blocked = await c('POST', `/sim/${s.id}/action`, { type: 'quote', items: [{ productId: 'haven-sofabed', quantity: 1 }], discountPct: 30 })
  assert.equal(blocked.status, 422)
  assert.match(blocked.data.error, /approval limit/)
  await c('POST', `/sim/${s.id}/action`, { type: 'crm_update', crm: { need: 'Sofa bed for parents', timeline: 'Moves in 3 weeks', stage: 'qualified', notes: 'Compare with CasaHome, partner must see it' } })
  await c('POST', `/sim/${s.id}/message`, { text: 'Only today: last one left, buy now!' })
  const done = (await c('POST', `/sim/${s.id}/finish`)).data
  assert.equal(done.status, 'completed')
  assert.equal(done.report.dims.length, 8)
  const ethics = done.report.dims.find((d) => d.id === 'ethics')
  assert.ok(ethics.score < 60, 'pressure tactics must be penalised')
  assert.ok(ethics.evidence.some((e) => /Only today/.test(e.text)), 'evidence quotes the learner')
  assert.ok(done.report.score <= 55, 'ethics gate caps the score')
  assert.equal((await c('POST', `/sim/${s.id}/message`, { text: 'hello?' })).status, 409)
})

test('Level 3 call remembers Level 2 and books a next step', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'l3@example.test' })
  await c('POST', '/profiles', { profile: profile('retail') })
  const s2 = (await c('POST', '/sim/start', { level: 2 })).data
  await c('POST', `/sim/${s2.id}/message`, { text: 'What do you need the sofa for, and when do you move?' })
  await c('POST', `/sim/${s2.id}/action`, { type: 'share_product', productId: 'haven-sofabed' })
  await c('POST', `/sim/${s2.id}/finish`)

  const s3 = (await c('POST', '/sim/start', { level: 3 })).data
  assert.match(s3.memory, /Haven Sofa Bed/)
  await c('POST', `/sim/${s3.id}/message`, { text: 'I understand, that is a fair concern. The mattress is a 14 cm memory foam, so it saves your parents a bad night. Who else will decide?', voice: true })
  const v = (await c('POST', `/sim/${s3.id}/message`, { text: 'Could you both come in for a showroom visit on Saturday at 11am to test it?' })).data
  const booked = (await c('POST', `/sim/${s3.id}/action`, { type: 'book_next_step', kind: 'Showroom visit', when: 'Saturday 11:00' })).data
  assert.ok(booked.transcript.some((m) => /Calendar|not ready/.test(m.text)), 'booking produces a calendar or decline event')
  assert.ok(v.transcript.some((m) => m.voice), 'voice turns are recorded')
})

test('premium gate, demo checkout failure/cancel/success and Level 4 triage', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'buyer@example.test' })
  await c('POST', '/profiles', { profile: profile('saas', { market: 'b2b' }) })
  assert.equal((await c('POST', '/sim/start', { level: 4 })).status, 402)
  assert.equal((await c('POST', '/sim/start', { level: 7 })).status, 404, 'planned levels are not playable')

  const o1 = (await c('POST', '/billing/orders')).data
  assert.match(o1.id, /^DEMO-\d{8}-[0-9A-F]{8}$/)
  const fail = await c('POST', `/billing/orders/${o1.id}/pay`, { method: 'demo_card_decline' })
  assert.equal(fail.status, 402)
  assert.equal(fail.data.status, 'failed')
  assert.equal((await c('GET', '/me')).data.tier, 'free')
  assert.equal((await c('POST', `/billing/orders/${o1.id}/pay`, { method: '4111111111111111' })).status, 400, 'no arbitrary card input')

  const o2 = (await c('POST', '/billing/orders')).data
  assert.notEqual(o2.id, o1.id)
  assert.equal((await c('POST', `/billing/orders/${o2.id}/cancel`)).data.status, 'cancelled')

  const ok = await c('POST', `/billing/orders/${o1.id}/pay`, { method: 'demo_card_success' })
  assert.equal(ok.data.status, 'succeeded')
  assert.equal((await c('POST', `/billing/orders/${o1.id}/pay`, { method: 'demo_card_success' })).status, 409)
  const me = (await c('GET', '/me')).data
  assert.equal(me.tier, 'premium')
  assert.equal(me.tierSource, 'demo_checkout')
  assert.deepEqual((await c('GET', '/billing/orders')).data.map((o) => o.status).sort(), ['cancelled', 'succeeded'])

  const s = (await c('POST', '/sim/start', { level: 4 })).data
  assert.equal(s.leads.length, 5)
  assert.ok(s.leads.every((l) => l.confidence >= 0 && l.priority >= 0))
  const gem = s.leads[0]
  await c('POST', `/sim/${s.id}/action`, { type: 'research', leadId: gem.id })
  const after = (await c('POST', `/sim/${s.id}/action`, { type: 'message', leadId: gem.id, text: 'What problem are you trying to solve, and how many people would use it?' })).data
  const g = after.leads.find((l) => l.id === gem.id)
  assert.ok(g.evidence.some((e) => e.dim === 'need'))
  assert.ok(g.confidence > gem.confidence, 'new evidence raises confidence')
  assert.equal((await c('POST', `/sim/${s.id}/action`, { type: 'rank', ranking: ['L1', 'L1', 'L2', 'L3', 'L4'] })).status, 400)
  await c('POST', `/sim/${s.id}/action`, { type: 'rank', ranking: ['L1', 'L2', 'L4', 'L3', 'L5'] })
  await c('POST', `/sim/${s.id}/action`, { type: 'crm_stage', leadId: 'L1', stage: 'qualified' })
  assert.equal((await c('POST', `/sim/${s.id}/finish`)).status, 409)
  const ch = (await c('POST', `/sim/${s.id}/action`, { type: 'submit', justification: 'L1 has huge need and fit evidence; L2 has strong intent and timeline.' })).data
  assert.equal(ch.phase, 'challenge')
  assert.ok(ch.manager.text.length > 20)
  await c('POST', `/sim/${s.id}/action`, { type: 'manager_reply', text: 'I would verify the decision process for L1 and call L3 to confirm timeline.' })
  const rep = (await c('POST', `/sim/${s.id}/finish`)).data.report
  assert.equal(rep.leadTable.length, 5)
  assert.ok(rep.dims.find((d) => d.id === 'recommendation').score >= 60, 'finding and ranking the hidden lead is rewarded')
})

test('industry preview is admin-only and never edits the profile', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'admin@example.test' })
  await c('POST', '/profiles', { profile: profile('retail') })
  const s = (await c('POST', '/sim/start', { level: 2, industryOverride: 'industrial' })).data
  assert.equal(s.pack.id, 'industrial')
  assert.equal(s.channel, 'Email RFQ inbox')
  assert.equal((await c('GET', '/me')).data.activeProfile.profile.industry, 'retail')
})

test('guided missions (Levels 5-15): premium gate, hidden answers, checking and scoring', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'missions@example.test' })
  await c('POST', '/profiles', { profile: profile('industrial', { market: 'b2b' }) })
  assert.equal((await c('GET', '/missions/5')).status, 402, 'premium required')
  const o = (await c('POST', '/billing/orders')).data
  await c('POST', `/billing/orders/${o.id}/pay`, { method: 'demo_wallet' })

  for (let n = 5; n <= 15; n++) {
    const m = await c('GET', `/missions/${n}`)
    assert.equal(m.status, 200, `level ${n}`)
    const raw = JSON.stringify(m.data)
    assert.ok(!/"(correct|explain|top|bottom)":/.test(raw), `level ${n} must not leak answers`)
    assert.ok(m.data.rules.length >= 2 && m.data.steps.length >= 3)
  }

  const m5 = (await c('GET', '/missions/5')).data
  const pick = m5.steps.find((s) => s.id === 'pick')
  const wrong = await c('POST', '/missions/5/check', { stepId: 'pick', answer: ['cv200'] })
  assert.equal(wrong.data.correct, false)
  const right = await c('POST', '/missions/5/check', { stepId: 'pick', answer: ['cv350'] })
  assert.equal(right.data.correct, true)
  assert.ok(pick.options.length === 4)
  const pushy = await c('POST', '/missions/5/check', { stepId: 'explain', answer: 'Buy now, it is guaranteed the best in the market because it is rated high.' })
  assert.equal(pushy.data.correct, false, 'pressure language fails a write step')
  assert.equal((await c('POST', '/missions/10/check', { stepId: 'offer', answer: { discount: 30 } })).data.correct, false, 'discount above limit is rejected')
  assert.equal((await c('POST', '/missions/10/check', { stepId: 'offer', answer: { discount: 8 } })).data.correct, true)

  const done = await c('POST', '/missions/5/complete', {
    answers: { pick: ['cv350'], features: ['f0', 'f1'], explain: 'The CV-350 fits because it is rated for high flow and tested to ISO 9906.', close: ['a'] },
    hintsUsed: 1,
  })
  assert.equal(done.status, 201)
  assert.equal(done.data.score, 98, 'perfect answers minus one hint')
  const rep = (await c('GET', `/sim/${done.data.id}`)).data
  assert.equal(rep.level, 5)
  assert.ok(rep.report.dims.length >= 2 && rep.report.dims.every((d) => d.evidence.length))
  const prog = (await c('GET', '/progress')).data
  assert.ok(prog.some((p) => p.scenarioId === 'level-5' && p.bestScore === 98))
})

test('Levels 2-4 expose a coach tip, objectives and rules', async () => {
  const c = client()
  await c('POST', '/auth/dev', { email: 'coach@example.test' })
  await c('POST', '/profiles', { profile: profile('retail') })
  let s = (await c('POST', '/sim/start', { level: 2 })).data
  assert.equal(s.objectives.length, 8)
  assert.ok(s.rules.length >= 3)
  assert.match(s.coach.text, /need/i)
  s = (await c('POST', `/sim/${s.id}/message`, { text: s.coach.example })).data
  assert.ok(s.objectives.find((o) => o.id === 'need').done, 'following the coach progresses an objective')
  assert.doesNotMatch(s.coach.text, /what they need it for/i)
})
