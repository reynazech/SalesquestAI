// The 15-level career map. Shared by the API (access checks) and the UI.
// status: 'playable' levels are fully built; 'planned' levels are shown on the
// map but cannot be started (the API refuses them too).

export const FREE_LEVELS = [1, 2, 3]
export const isPremiumLevel = (n) => !FREE_LEVELS.includes(n)

export const levels = [
  { n: 1, key: 'training-lab', title: 'Training Lab', mechanic: 'Guided decisions', ui: 'Scenario cards', status: 'playable' },
  { n: 2, key: 'inbox', title: 'Social Sales Inbox', mechanic: 'Free-text messaging, product cards, CRM notes', ui: 'Messaging inbox', status: 'playable' },
  { n: 3, key: 'call', title: 'Call Console', mechanic: 'Push-to-talk voice call with captions', ui: 'Call console', status: 'playable' },
  { n: 4, key: 'triage', title: 'Lead Triage War Room', mechanic: 'Investigate, rank and defend five leads', ui: 'Lead command center', status: 'playable' },
  { n: 5, key: 'showroom', title: 'Showroom / Product Demo', mechanic: 'Catalogue comparison and spoken demo', ui: 'Product showroom', status: 'planned' },
  { n: 6, key: 'ghosted', title: 'Ghosted Lead', mechanic: 'Timeline-based follow-ups', ui: 'Follow-up timeline', status: 'planned' },
  { n: 7, key: 'referral', title: 'Referral Network', mechanic: 'Relationship mapping', ui: 'Relationship map', status: 'planned' },
  { n: 8, key: 'complaint', title: 'Complaint Desk', mechanic: 'Emotional voice call and escalation', ui: 'Service desk', status: 'planned' },
  { n: 9, key: 'exhibition', title: 'Exhibition Floor', mechanic: 'Rapid voice conversations, lead capture', ui: 'Event floor', status: 'planned' },
  { n: 10, key: 'negotiation', title: 'Negotiation Desk', mechanic: 'Pricing calculator, discount limits, approvals', ui: 'Deal desk', status: 'planned' },
  { n: 11, key: 'corporate-demo', title: 'Corporate Demo', mechanic: 'Video meeting with several stakeholders', ui: 'Meeting room', status: 'planned' },
  { n: 12, key: 'rfq', title: 'RFQ / Proposal Challenge', mechanic: 'Requirements, compliant quote, proposal', ui: 'Proposal builder', status: 'planned' },
  { n: 13, key: 'pipeline', title: 'Pipeline Review', mechanic: 'CRM analytics and forecast review', ui: 'Pipeline analytics', status: 'planned' },
  { n: 14, key: 'enterprise', title: 'Enterprise Deal', mechanic: 'Stakeholders, procurement, revisions', ui: 'Deal room', status: 'planned' },
  { n: 15, key: 'cockpit', title: 'Sales Operations Cockpit', mechanic: 'A full simulated working day', ui: 'Operations cockpit', status: 'planned' },
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
