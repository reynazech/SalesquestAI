import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateProfile } from '../src/training/options.js'
import { createSimRouter, userTier } from './sim/routes.js'
import { createBillingRouter } from './billing.js'
import { aiEnabled } from './sim/customer.js'
import {
  verifyGoogleCredential,
  upsertUser,
  startSession,
  endSession,
  sessionMiddleware,
  requireAuth,
} from './auth.js'

const SCENARIO_ID = /^[a-z0-9:_-]{1,64}$/

function profileDto(row, attemptCounts = {}) {
  return {
    id: row.id,
    industry: row.industry,
    profile: JSON.parse(row.data),
    complete: !!row.complete,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attempts: attemptCounts[row.id] || 0,
  }
}

/**
 * Builds the API. Options:
 *  db              node:sqlite database (migrated)
 *  googleClientId  OAuth Web Client ID (public, no secret)
 *  devLogin        enable /api/auth/dev (never in production)
 *  secureCookies   set the Secure flag on cookies (HTTPS)
 *  verifyGoogle    override for tests
 *  staticDir       serve the built SPA from here (production)
 */
export function createApp({
  db,
  googleClientId = '',
  devLogin = false,
  secureCookies = false,
  verifyGoogle,
  staticDir,
  adminEmails = [],
  demoPriceAed = 49,
} = {}) {
  const app = express()
  const verify = verifyGoogle || ((credential) => verifyGoogleCredential(credential, googleClientId))
  const admins = adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
  // Demo admins may preview other industries. In local dev-login mode every user can.
  const isAdmin = (user) => !!user && (devLogin || admins.includes(String(user.email).toLowerCase()))

  app.disable('x-powered-by')
  app.set('trust proxy', 'loopback, uniquelocal')
  app.use(express.json({ limit: '32kb' }))
  app.use(sessionMiddleware(db))

  const api = express.Router()

  api.get('/health', (_req, res) => res.json({ ok: true }))

  // ---- Auth ----
  api.get('/auth/config', (_req, res) => res.json({ googleClientId: googleClientId || null, devLogin }))

  api.post('/auth/google', async (req, res) => {
    if (!googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured' })
    const credential = req.body?.credential
    if (typeof credential !== 'string') return res.status(400).json({ error: 'Missing credential' })
    try {
      const identity = await verify(credential)
      const user = upsertUser(db, identity)
      startSession(db, res, user.id, secureCookies)
      res.json({ ok: true })
    } catch {
      res.status(401).json({ error: 'Google sign-in could not be verified' })
    }
  })

  if (devLogin) {
    // Local-only sign-in for testing without Google. Disabled in production.
    api.post('/auth/dev', (req, res) => {
      const email = String(req.body?.email || 'dev@example.test').trim().slice(0, 120)
      const user = upsertUser(db, { sub: `dev:${email}`, email, name: req.body?.name || email.split('@')[0], picture: null })
      startSession(db, res, user.id, secureCookies)
      res.json({ ok: true })
    })
  }

  api.post('/auth/logout', (req, res) => {
    endSession(db, req, res, secureCookies)
    res.json({ ok: true })
  })

  // ---- Account ----
  api.get('/me', (req, res) => {
    if (!req.user) return res.json({ user: null })
    const u = req.user
    const counts = Object.fromEntries(
      db
        .prepare('SELECT profile_id, COUNT(*) n FROM attempts WHERE user_id = ? GROUP BY profile_id')
        .all(u.id)
        .map((r) => [r.profile_id, r.n]),
    )
    const profiles = db
      .prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY updated_at DESC')
      .all(u.id)
      .map((r) => profileDto(r, counts))
    const active = profiles.find((p) => p.id === u.active_profile_id) || null
    const { tier, source } = userTier(db, u.id)
    res.json({
      user: { id: u.id, email: u.email, name: u.name, picture: u.picture },
      tier,
      tierSource: source,
      isAdmin: isAdmin(u),
      aiEnabled: aiEnabled(),
      profiles,
      activeProfile: active,
      needsOnboarding: !active || !active.complete,
    })
  })

  // ---- Training profiles ----
  const ownProfile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?')

  api.post('/profiles', requireAuth, (req, res) => {
    const { profile, complete } = validateProfile(req.body?.profile)
    if (!profile.industry) return res.status(400).json({ error: 'Industry is required' })
    const { lastInsertRowid } = db
      .prepare('INSERT INTO profiles (user_id, industry, data, complete) VALUES (?, ?, ?, ?)')
      .run(req.user.id, profile.industry, JSON.stringify(profile), complete ? 1 : 0)
    const id = Number(lastInsertRowid)
    if (req.body?.activate !== false) db.prepare('UPDATE users SET active_profile_id = ? WHERE id = ?').run(id, req.user.id)
    res.status(201).json(profileDto(ownProfile.get(id, req.user.id)))
  })

  api.put('/profiles/:id', requireAuth, (req, res) => {
    const row = ownProfile.get(Number(req.params.id), req.user.id)
    if (!row) return res.status(404).json({ error: 'Profile not found' })
    const { profile, complete } = validateProfile(req.body?.profile)
    if (!profile.industry) return res.status(400).json({ error: 'Industry is required' })
    db.prepare(`UPDATE profiles SET industry = ?, data = ?, complete = ?, updated_at = datetime('now') WHERE id = ?`).run(
      profile.industry,
      JSON.stringify(profile),
      complete ? 1 : 0,
      row.id,
    )
    res.json(profileDto(ownProfile.get(row.id, req.user.id)))
  })

  api.post('/profiles/:id/activate', requireAuth, (req, res) => {
    const row = ownProfile.get(Number(req.params.id), req.user.id)
    if (!row) return res.status(404).json({ error: 'Profile not found' })
    db.prepare('UPDATE users SET active_profile_id = ? WHERE id = ?').run(row.id, req.user.id)
    res.json({ ok: true })
  })

  // ---- Attempts & progress ----
  api.post('/attempts', requireAuth, (req, res) => {
    const { scenarioId, profileId = null, score, outcome = '', choices = [] } = req.body || {}
    if (!SCENARIO_ID.test(scenarioId || '')) return res.status(400).json({ error: 'Invalid scenario' })
    if (!Number.isInteger(score) || score < 0 || score > 100) return res.status(400).json({ error: 'Invalid score' })
    if (!Array.isArray(choices) || choices.length > 20) return res.status(400).json({ error: 'Invalid choices' })
    if (profileId !== null && !ownProfile.get(Number(profileId), req.user.id)) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    const pid = profileId === null ? null : Number(profileId)
    const { lastInsertRowid } = db
      .prepare('INSERT INTO attempts (user_id, profile_id, scenario_id, score, outcome, choices) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, pid, scenarioId, score, String(outcome).slice(0, 120), JSON.stringify(choices.map(String)))
    db.prepare(
      `INSERT INTO progress (user_id, profile_key, scenario_id, best_score, attempts, completed) VALUES (?, ?, ?, ?, 1, 1)
       ON CONFLICT(user_id, profile_key, scenario_id) DO UPDATE SET best_score = max(best_score, excluded.best_score),
         attempts = attempts + 1, completed = 1, updated_at = datetime('now')`,
    ).run(req.user.id, pid ?? 0, scenarioId, score)
    res.status(201).json({ id: Number(lastInsertRowid) })
  })

  api.get('/attempts', requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, profile_id, scenario_id, score, outcome, created_at FROM attempts
         WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`,
      )
      .all(req.user.id)
    res.json(rows.map((r) => ({ id: r.id, profileId: r.profile_id, scenarioId: r.scenario_id, score: r.score, outcome: r.outcome, createdAt: r.created_at })))
  })

  api.get('/progress', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM progress WHERE user_id = ?').all(req.user.id)
    res.json(
      rows.map((r) => ({
        profileId: r.profile_key || null,
        scenarioId: r.scenario_id,
        bestScore: r.best_score,
        attempts: r.attempts,
        completed: !!r.completed,
      })),
    )
  })

  api.use('/sim', createSimRouter({ db, isAdmin }))
  api.use('/billing', createBillingRouter({ db, priceAed: demoPriceAed }))

  api.use((_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use('/api', api)

  // Production: serve the built SPA with client-side routing fallback.
  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }))
    app.get('/{*path}', (_req, res) => res.sendFile(join(staticDir, 'index.html')))
  }

  return app
}
