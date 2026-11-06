// Onboarding choices. Shared by the React app and the API (for validation).

export const careerStatuses = [
  { id: 'beginner', label: 'Beginner', hint: 'New to sales and learning the basics' },
  { id: 'professional', label: 'Working professional', hint: 'Currently in a sales or customer-facing role' },
  { id: 'aspiring', label: 'Aspiring salesperson', hint: 'Planning a move into sales' },
]

export const industries = [
  { id: 'saas', label: 'SaaS / IT', icon: '💻' },
  { id: 'retail', label: 'Retail', icon: '🛍️' },
  { id: 'ecommerce', label: 'E-commerce', icon: '📦' },
  { id: 'real_estate', label: 'Real estate', icon: '🏠' },
  { id: 'industrial', label: 'Industrial / engineering', icon: '⚙️' },
  { id: 'automotive', label: 'Automotive', icon: '🚗' },
  { id: 'services', label: 'Services', icon: '🤝' },
  { id: 'finance', label: 'Finance', icon: '💳' },
  { id: 'custom', label: 'Something else', icon: '✏️' },
]

export const companyTypes = [
  { id: 'startup', label: 'Startup' },
  { id: 'sme', label: 'SME' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'agency', label: 'Agency' },
  { id: 'distributor', label: 'Distributor' },
  { id: 'consultancy', label: 'Consultancy' },
]

export const markets = [
  { id: 'b2b', label: 'B2B', hint: 'Selling to businesses' },
  { id: 'b2c', label: 'B2C', hint: 'Selling to consumers' },
  { id: 'hybrid', label: 'Hybrid', hint: 'Both' },
]

export const dealSizes = [
  { id: 'under_1k', label: 'Under $1k' },
  { id: '1k_10k', label: '$1k – $10k' },
  { id: '10k_100k', label: '$10k – $100k' },
  { id: 'over_100k', label: '$100k+' },
  { id: 'unsure', label: 'Not sure' },
]

export const channels = [
  { id: 'in_person', label: 'In person' },
  { id: 'phone', label: 'Phone' },
  { id: 'video', label: 'Video calls' },
  { id: 'email', label: 'Email' },
  { id: 'chat', label: 'Chat / WhatsApp' },
  { id: 'social', label: 'Social / LinkedIn' },
]

export const experienceLevels = [
  { id: 'none', label: 'No experience', years: '0' },
  { id: 'junior', label: 'Junior', years: '< 2 yrs' },
  { id: 'mid', label: 'Mid-level', years: '2–5 yrs' },
  { id: 'senior', label: 'Senior', years: '5+ yrs' },
]

export const skills = [
  { id: 'prospecting', label: 'Prospecting' },
  { id: 'discovery', label: 'Discovery questions' },
  { id: 'pitching', label: 'Pitching value' },
  { id: 'objections', label: 'Handling objections' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closing', label: 'Closing & next steps' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'rapport', label: 'Building rapport' },
]

export const regions = [
  'India', 'United Arab Emirates', 'United Kingdom', 'United States', 'Europe', 'Asia-Pacific', 'Middle East', 'Africa', 'Latin America', 'Other',
]

export const languages = ['English', 'Hindi', 'Arabic', 'Malayalam', 'Tamil', 'Spanish', 'French', 'German', 'Other']

const ids = (list) => list.map((o) => o.id)

// Normalises a profile payload and lists any missing required fields.
// Unknown keys are dropped so the stored JSON stays predictable.
export function validateProfile(input = {}) {
  const p = {}
  const errors = []
  const pick = (key, allowed, required = true) => {
    const v = input[key]
    if (allowed.includes(v)) p[key] = v
    else if (required) errors.push(key)
  }
  const text = (key, required = true, max = 120) => {
    const v = typeof input[key] === 'string' ? input[key].trim().slice(0, max) : ''
    if (v) p[key] = v
    else if (required) errors.push(key)
  }
  const many = (key, allowed, required = true) => {
    const v = Array.isArray(input[key]) ? [...new Set(input[key].filter((x) => allowed.includes(x)))] : []
    if (v.length) p[key] = v
    else if (required) errors.push(key)
  }

  pick('careerStatus', ids(careerStatuses))
  pick('industry', ids(industries))
  if (p.industry === 'custom') text('customIndustry')
  pick('market', ids(markets))
  text('role')
  pick('companyType', ids(companyTypes), p.careerStatus === 'professional')
  text('products', true, 200)
  text('typicalCustomer', true, 200)
  if (p.market !== 'b2c') pick('dealSize', ids(dealSizes), false)
  many('channels', ids(channels))
  // Beginners and aspiring sellers are treated as having no experience.
  if (p.careerStatus === 'professional') pick('experience', ids(experienceLevels))
  else if (p.careerStatus) p.experience = 'none'
  pick('region', regions)
  pick('language', languages)
  many('skills', ids(skills))

  return { profile: p, errors, complete: errors.length === 0 }
}
