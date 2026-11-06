import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { openDb } from './db.js'
import { createApp } from './app.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 8787)
const dbFile = resolve(root, process.env.DATABASE_FILE || 'data/salesquest.db')

const db = openDb(dbFile)
const app = createApp({
  db,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  devLogin: !isProd && process.env.DEV_LOGIN === '1',
  secureCookies: isProd,
  staticDir: isProd ? join(root, 'dist') : undefined,
  adminEmails: (process.env.ADMIN_EMAILS || '').split(','),
  demoPriceAed: Number(process.env.DEMO_PRICE_AED || 49),
})

app.listen(port, () => {
  console.log(`SalesQuest API on http://localhost:${port} (db: ${dbFile})`)
  if (!process.env.GOOGLE_CLIENT_ID) console.log('GOOGLE_CLIENT_ID not set: Google sign-in disabled')
})
