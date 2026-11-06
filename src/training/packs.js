// Public facts about each industry pack, safe for the browser bundle.
// Hidden customer data lives only in server/sim/content.js.

export const packMeta = {
  retail: {
    label: 'Retail & e-commerce',
    seller: 'Northwind Living',
    icon: '🛍️',
    sells: 'home furniture',
    inbox: { social: 'Instagram DMs', default: 'WhatsApp Business' },
    call: 'Phone call',
    terminology: { deal: 'order', customer: 'shopper', meeting: 'showroom visit', pipeline: 'leads' },
    tools: ['Product catalogue', 'Stock & delivery check', 'Quote builder', 'CRM notes', 'Showroom calendar'],
  },
  saas: {
    label: 'SaaS / IT',
    seller: 'Brightpath Software',
    icon: '💻',
    sells: 'FlowDesk subscriptions',
    inbox: { social: 'LinkedIn messages', default: 'Website demo-request chat' },
    call: 'Discovery call',
    terminology: { deal: 'deal', customer: 'prospect', meeting: 'demo', pipeline: 'pipeline' },
    tools: ['Plan catalogue', 'Onboarding-time check', 'Subscription quote', 'CRM notes', 'Demo calendar'],
  },
  realestate: {
    label: 'Real estate',
    seller: 'Harbourline Realty',
    icon: '🏠',
    sells: 'residential properties',
    inbox: { social: 'Property portal enquiries', default: 'Property portal enquiries' },
    call: 'Phone call',
    terminology: { deal: 'offer', customer: 'buyer', meeting: 'viewing', pipeline: 'buyer pipeline' },
    tools: ['Listings', 'Availability check', 'Offer calculator', 'CRM notes', 'Viewing calendar'],
  },
  industrial: {
    label: 'Industrial / engineering',
    seller: 'Corvane Industrial Supply',
    icon: '⚙️',
    sells: 'pumps, valves and spares',
    inbox: { social: 'Email RFQ inbox', default: 'Email RFQ inbox' },
    call: 'Technical call',
    terminology: { deal: 'order', customer: 'buyer', meeting: 'technical meeting', pipeline: 'RFQ pipeline' },
    tools: ['Product datasheets', 'Stock & lead-time check', 'Quotation builder', 'CRM notes', 'Site-visit calendar'],
  },
}

// Maps an onboarding profile to the closest training pack.
export function packIdForProfile(profile = {}) {
  const { industry, market } = profile
  switch (industry) {
    case 'saas':
    case 'finance':
      return 'saas'
    case 'retail':
    case 'ecommerce':
      return 'retail'
    case 'real_estate':
      return 'realestate'
    case 'industrial':
      return 'industrial'
    case 'automotive':
      return market === 'b2b' ? 'industrial' : 'retail'
    case 'services':
      return market === 'b2c' ? 'retail' : 'saas'
    default:
      return market === 'b2c' ? 'retail' : 'saas'
  }
}

// Social DMs only where the learner actually sells through social channels.
export function inboxChannel(packId, profile = {}) {
  const social = (profile.channels || []).includes('social')
  const inbox = packMeta[packId].inbox
  return social ? inbox.social : inbox.default
}
