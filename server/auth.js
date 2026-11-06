import { createHash, randomBytes } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'sq_session'
const SESSION_DAYS = 30

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

// Verifies a Google Identity Services ID token (no client secret needed).
export async function verifyGoogleCredential(credential, clientId) {
  const { payload } = await jwtVerify(credential, googleKeys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  })
  if (!payload.email || payload.email_verified !== true) throw new Error('Google account email is not verified')
  return { sub: payload.sub, email: payload.email, name: payload.name || payload.email, picture: payload.picture || null }
}

const hash = (token) => createHash('sha256').update(token).digest('hex')

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k, v]) => k && v !== undefined)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]),
  )
}

function cookie(value, maxAgeSeconds, secure) {
  return [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function upsertUser(db, { sub, email, name, picture }) {
  db.prepare(
    `INSERT INTO users (google_sub, email, name, picture, last_login_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name,
       picture = excluded.picture, last_login_at = datetime('now')`,
  ).run(sub, email, name, picture)
  const user = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub)
  // Every account starts with the free tier.
  const hasTier = db.prepare('SELECT 1 FROM entitlements WHERE user_id = ?').get(user.id)
  if (!hasTier) db.prepare(`INSERT INTO entitlements (user_id, tier, source) VALUES (?, 'free', 'signup')`).run(user.id)
  return user
}

export function startSession(db, res, userId, secure) {
  const token = randomBytes(32).toString('base64url')
  db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).run(
    hash(token),
    userId,
    `+${SESSION_DAYS} days`,
  )
  res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86400, secure))
}

export function endSession(db, req, res, secure) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token))
  res.setHeader('Set-Cookie', cookie('', 0, secure))
}

// Attaches req.user when the session cookie is valid.
export function sessionMiddleware(db) {
  const find = db.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
  )
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    req.user = token ? find.get(hash(token)) || null : null
    next()
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' })
  next()
}
