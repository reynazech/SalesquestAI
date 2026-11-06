# SalesQuest AI

A gamified sales-career simulator prototype. Learners train with personalised,
free-form missions instead of quizzes.

**Live:** https://salesquestai.reynazech.tech

## What's playable

| Level | Mission | Access | Status |
|---|---|---|---|
| 1 | Training Lab (guided decisions) | Free | Playable |
| 2 | Social Sales Inbox (free-text chat, product cards, CRM) | Free | Playable |
| 3 | Call Console (push-to-talk voice, captions, text fallback) | Free | Playable |
| 4 | Lead Triage War Room (evidence-based lead scoring) | Premium | Playable |
| 5–15 | Showroom, Ghosted Lead, Negotiation, RFQ, Enterprise… | Premium | Planned |

Missions adapt to the learner's onboarding profile: retail, SaaS, real estate
and industrial packs change the company, products, prices (by region),
channels, customers and leads. All companies and people are fictional.

## Stack

- React 19 + Vite + Tailwind CSS 4, React Router
- Node 24 + Express 5 API, SQLite via built-in `node:sqlite` (versioned migrations)
- Google Identity Services (ID-token flow, no client secret)
- Claude (`claude-opus-5-5`) for customer dialogue when `ANTHROPIC_API_KEY` is set;
  otherwise a deterministic scripted customer. Prices, discounts, stock, CRM and
  scores are always validated by deterministic server code.
- Browser Web Speech API for push-to-talk and spoken replies

## Run locally

```bash
npm install
cp .env.example .env   # DEV_LOGIN=1 enables a local-only test sign-in
npm run dev            # API on :8787, web on :5173 (proxied /api)
npm test               # API tests
```

## Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID (public) |
| `ANTHROPIC_API_KEY` | Enables AI customers, manager and coaching debrief (secret) |
| `ADMIN_EMAILS` | Comma-separated emails allowed to use the demo industry preview |
| `DEMO_PRICE_AED` | Example premium price shown in the demo checkout (default 49) |
| `DEV_LOGIN` | `1` enables local test sign-in; ignored in production |
| `DATABASE_FILE`, `PORT` | Optional overrides |

Never commit `.env`. On the server, keep secrets in an `.env` file readable only by root.

## Demo checkout

The premium checkout is a **demo**: no payment provider, no card fields, no real
money. Demo methods simulate success or decline, orders get unique `DEMO-…`
transaction IDs, and successful demo orders grant a premium entitlement marked
`demo_checkout`. Premium access is checked on the server for every mission request.

## Deploy (Docker)

```bash
docker build -t salesquestai .
docker run -d --env-file .env -v $PWD/data:/app/data -p 8787:8787 salesquestai
```
