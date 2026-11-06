// The 15-level career map. Shared by the API (access checks) and the UI.
// status: every level is playable. Levels 2-4 are free-form simulations;
// Levels 5-15 are guided missions (server/missions).

export const FREE_LEVELS = [1, 2, 3]
export const isPremiumLevel = (n) => !FREE_LEVELS.includes(n)

export const levels = [
  { n: 1, key: 'training-lab', title: 'Training Lab', mechanic: 'Guided decisions', ui: 'Scenario cards', status: 'playable' },
  { n: 2, key: 'inbox', title: 'Social Sales Inbox', mechanic: 'Free-text messaging, product cards, CRM notes', ui: 'Messaging inbox', status: 'playable' },
  { n: 3, key: 'call', title: 'Call Console', mechanic: 'Push-to-talk voice call with captions', ui: 'Call console', status: 'playable' },
  { n: 4, key: 'triage', title: 'Lead Triage War Room', mechanic: 'Investigate, rank and defend five leads', ui: 'Lead command center', status: 'playable' },
  { n: 5, key: 'showroom', title: 'Showroom / Product Demo', mechanic: 'Match products to needs and run a demo', ui: 'Product showroom', status: 'playable' },
  { n: 6, key: 'ghosted', title: 'Ghosted Lead', mechanic: 'Plan follow-ups and win back a silent lead', ui: 'Follow-up timeline', status: 'playable' },
  { n: 7, key: 'referral', title: 'Referral Network', mechanic: 'Ask for referrals and qualify new buyers', ui: 'Relationship map', status: 'playable' },
  { n: 8, key: 'complaint', title: 'Complaint Desk', mechanic: 'Calm an upset customer, fix or escalate', ui: 'Service desk', status: 'playable' },
  { n: 9, key: 'exhibition', title: 'Exhibition Floor', mechanic: 'Prioritise visitors and plan follow-ups', ui: 'Event floor', status: 'playable' },
  { n: 10, key: 'negotiation', title: 'Negotiation Desk', mechanic: 'Pricing calculator, discount limits, approvals', ui: 'Deal desk', status: 'playable' },
  { n: 11, key: 'corporate-demo', title: 'Corporate Demo', mechanic: 'Win over technical and business stakeholders', ui: 'Meeting room', status: 'playable' },
  { n: 12, key: 'rfq', title: 'RFQ / Proposal Challenge', mechanic: 'Requirements, compliant quote, proposal', ui: 'Proposal builder', status: 'playable' },
  { n: 13, key: 'pipeline', title: 'Pipeline Review', mechanic: 'CRM analytics and forecast review', ui: 'Pipeline analytics', status: 'playable' },
  { n: 14, key: 'enterprise', title: 'Enterprise Deal', mechanic: 'Stakeholders, procurement, revisions', ui: 'Deal room', status: 'playable' },
  { n: 15, key: 'cockpit', title: 'Sales Operations Cockpit', mechanic: 'A full simulated working day', ui: 'Operations cockpit', status: 'playable' },
].map((l) => ({ ...l, tier: isPremiumLevel(l.n) ? 'premium' : 'free' }))

export const getLevel = (n) => levels.find((l) => l.n === Number(n)) || null

// Industry-specific mission names and briefs for the playable levels.
const personalised = {
  retail: {
    2: ['Instagram DM Rush', 'A shopper slides into your DMs about a sofa from your latest reel.'],
    3: ['Showroom Callback', 'The same shopper calls back with her partner’s doubts.'],
    4: ['Weekend Lead Triage', 'Five leads from Instagram, the showroom, web carts and WhatsApp.'],
  },
  saas: {
    2: ['Demo Request Inbox', 'A Head of Ops asks about integrations before booking a demo.'],
    3: ['Discovery Call', 'He calls back after IT raised security questions.'],
    4: ['Pipeline War Room', 'Trials, demo requests and upsells compete for your week.'],
  },
  realestate: {
    2: ['Portal Enquiry Desk', 'A relocating parent enquires about a marina apartment.'],
    3: ['Buyer Callback', 'She calls back with her husband’s concerns from abroad.'],
    4: ['Buyer Pipeline Triage', 'Portal, open-house and referral leads all want viewings.'],
  },
  industrial: {
    2: ['RFQ Inbox', 'A plant engineer emails an RFQ for six pumps.'],
    3: ['Technical Call', 'Procurement now asks about staged delivery.'],
    4: ['RFQ Pipeline Triage', 'Datasheet downloads, phone RFQs and trade-show scans.'],
  },
}

export function missionCopy(n, packId) {
  const l = getLevel(n)
  const p = personalised[packId]?.[n]
  return { title: p?.[0] || l.title, brief: p?.[1] || l.mechanic }
}

// Display currency by region. Prices are stored in USD.
const currencies = {
  India: ['INR', 83],
  'United Arab Emirates': ['AED', 3.67],
  'Middle East': ['AED', 3.67],
  'United Kingdom': ['GBP', 0.79],
  Europe: ['EUR', 0.92],
}

export function currencyFor(region) {
  const [code, rate] = currencies[region] || ['USD', 1]
  return { code, rate }
}

export function formatMoney(usd, region) {
  const { code, rate } = currencyFor(region)
  const amount = usd * rate
  return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: amount < 100 ? 2 : 0 }).format(amount)
}
