// Guided missions for Levels 5-15. Each mission is a short sequence of steps
// built from the learner's (localized) industry pack. Answers and checking
// rules stay on the server; the client only receives what it needs to render.
//
// Step types:
//   choose  pick 1 (or `pick` many) options          correct: [ids]
//   rank    order items                               top / bottom ids
//   match   assign each left item one of `choices`    correct: { leftId: choice }
//   write   free text checked for key ideas           groups: [{ label, re }], need
//   calc    choose a discount for a priced offer      maxDiscount, budget

const people = {
  retail: ['Hannah Cole', 'Ravi Menon', 'Sara Ali', 'Tom Becker', 'Mei Lin'],
  saas: ['Priya Shah', 'Jonas Weber', 'Amara Okoye', 'Luis Ortega', 'Emma Clarke'],
  realestate: ['Nadia Haddad', 'Ben Carter', 'Yusuf Khan', 'Clara Rossi', 'Arjun Rao'],
  industrial: ['Dieter Brandt', 'Fatima Noor', 'Sam Okafor', 'Ingrid Holm', 'Marco Silva'],
}

const re = (s) => new RegExp(s, 'i')
const W = {
  thanks: { label: 'Thank them', re: re('\\b(thank|thanks|appreciate|grateful)') },
  question: { label: 'Ask a question', re: re('\\?') },
  value: { label: 'Offer something useful', re: re('\\b(guide|tip|case study|example|update|resource|idea|checklist|comparison|summary|video|demo|sample)') },
  reason: { label: 'Give a reason', re: re('\\b(because|so that|which means|that means|since|so you)') },
  apology: { label: 'Apologise sincerely', re: re('\\b(sorry|apolog)') },
  commitment: { label: 'Commit to an action with a time', re: re('\\b(today|tomorrow|by (monday|tuesday|wednesday|thursday|friday)|within \\d+|on (monday|tuesday|wednesday|thursday|friday|saturday)|this week|\\d{1,2}(:\\d{2})?\\s?(am|pm))') },
  checkIn: { label: 'Invite them to reply', re: re('\\b(let me know|anything else|happy to help|questions|reply|reach out)') },
  intro: { label: 'Ask for an introduction', re: re('\\b(introduc|intro|who else|anyone|know someone|refer|connect)') },
  plan: { label: 'Say what you will do next', re: re('\\b(will|plan|next step|going to|i\\x27ll)') },
  date: { label: 'Mention a day or date', re: re('\\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|week|\\d{1,2}(st|nd|rd|th)?\\b)') },
  total: { label: 'Confirm the price or total', re: re('\\b(total|price|cost|amount|aed|usd|inr|gbp|eur|\\$)') },
}

function base(pack) {
  const ideal = pack.products.find((p) => pack.customer.idealProducts.includes(p.id)) || pack.products[0]
  const others = pack.products.filter((p) => p.id !== ideal.id)
  return { ideal, others, names: people[pack.id], t: pack.terminology, step: pack.nextStepTypes }
}

export const MISSIONS = {
  5: (pack, fmt) => {
    const { ideal, others, names, t } = base(pack)
    const need = ideal.specs[0].toLowerCase()
    return {
      title: 'Showroom / Product Demo',
      scene: { type: 'products', title: `${pack.seller} catalogue`, items: pack.products.map((p) => ({ name: p.name, price: fmt(p.price) + (p.unit ? ` / ${p.unit}` : ''), specs: p.specs })), note: `${names[0]} (${t.customer}): “I specifically need something with ${need}.”` },
      rules: ['Read what the customer needs in the note above.', 'Pick the product that fits, then show the features that matter to them.', 'Close with an invitation, not pressure.'],
      steps: [
        { id: 'pick', type: 'choose', dim: 'recommendation', prompt: `Which product best fits ${names[0]}’s need (${need})?`, hint: 'Compare each product’s specs with the exact need in the note.', options: pack.products.map((p) => ({ id: p.id, label: p.name, detail: p.specs.join(' · ') })), correct: [ideal.id], explain: `${ideal.name} lists “${ideal.specs[0]}”, exactly what they asked for.` },
        { id: 'features', type: 'choose', pick: 2, dim: 'listening', prompt: 'Which TWO features should you highlight in the demo?', hint: 'Choose features of the product you recommended, the ones linked to their need.', options: [...ideal.specs.slice(0, 2).map((s, i) => ({ id: `f${i}`, label: s })), { id: 'x0', label: others[0].specs[0] }, { id: 'x1', label: others[1]?.specs[1] || others[0].specs[1] }], correct: ['f0', 'f1'], explain: 'Demo the features of the product they’ll actually buy, linked to their need.' },
        { id: 'explain', type: 'write', dim: 'recommendation', prompt: `In one or two sentences, tell ${names[0]} why ${ideal.name} fits.`, hint: 'Mention their need and say “because…” or “which means…”.', placeholder: `${ideal.name} is a good fit because…`, groups: [W.reason, { label: 'Mention a feature', re: re(ideal.specs.flatMap((s) => s.split(/[^A-Za-z0-9²³]+/)).filter((w) => w.length > 3).join('|')) }], need: 2 },
        { id: 'close', type: 'choose', dim: 'nextSteps', prompt: 'How do you close the demo?', hint: 'Invite them to a concrete next step without pressure.', options: [{ id: 'a', label: `“Would you like to see it in action at a ${t.meeting} on Saturday at 11am?”` }, { id: 'b', label: '“This is the last one in stock, you should decide right now.”' }, { id: 'c', label: '“Let me know if you’re ever interested.”' }], correct: ['a'], explain: 'A specific, low-pressure invitation keeps momentum. “Last one” is fake scarcity.' },
      ],
    }
  },

  6: (pack) => {
    const { names, t } = base(pack)
    const n = names[1]
    return {
      title: 'Ghosted Lead',
      scene: { type: 'timeline', title: `Conversation with ${n}`, items: [{ day: 'Day 1', who: 'You', text: `Sent ${n} a proposal after a great first call.` }, { day: 'Day 3', who: '—', text: 'No reply.' }, { day: 'Day 6', who: '—', text: 'Still no reply. Opened the email twice.' }] },
      rules: ['Silence usually means “busy”, not “no”.', 'Space your follow-ups out and add value each time.', 'Never guilt-trip or spam.'],
      steps: [
        { id: 'cadence', type: 'match', dim: 'workflow', prompt: 'Schedule a sensible follow-up plan: pick the best day for each message.', hint: 'Start gently, add value in the middle, and close the loop last.', left: [{ id: 'm1', label: 'Quick check they received the proposal' }, { id: 'm2', label: 'Share a short, useful resource' }, { id: 'm3', label: 'Polite “should I close your file?” message' }], choices: ['Day 7', 'Day 12', 'Day 20'], correct: { m1: 'Day 7', m2: 'Day 12', m3: 'Day 20' } },
        { id: 'best', type: 'choose', dim: 'ethics', prompt: 'Which follow-up is best?', hint: 'Pick the one that helps them, not the one that pressures them.', options: [{ id: 'a', label: `“Hi ${n.split(' ')[0]}, I put together a one-page summary of the options we discussed. Would it help to go through it for 10 minutes this week?”` }, { id: 'b', label: '“Just checking in AGAIN!!! Did you read my email?”' }, { id: 'c', label: '“I’m disappointed I haven’t heard back after all my effort.”' }], correct: ['a'], explain: 'Adding value and a small ask makes replying easy.' },
        { id: 'write', type: 'write', dim: 'listening', prompt: `Write your own short follow-up to ${n.split(' ')[0]}.`, hint: 'Greet them, offer something useful, ask one easy question.', placeholder: `Hi ${n.split(' ')[0]}, …`, groups: [W.value, W.question], need: 2 },
        { id: 'reply', type: 'choose', dim: 'nextSteps', prompt: `${n.split(' ')[0]} finally replies: “Sorry, crazy month. Still interested, but busy.” What now?`, hint: 'Make it easy: a small, specific next step.', options: [{ id: 'a', label: '“No problem! Shall we pencil in 15 minutes next Tuesday at 10am? I’ll keep it short.”' }, { id: 'b', label: '“Great, I’ll send the contract today.”' }, { id: 'c', label: '“Okay, get back to me when you’re less busy.”' }], correct: ['a'], explain: 'Respect their time and secure a small dated next step.' },
      ],
    }
  },

  7: (pack) => {
    const { names, t } = base(pack)
    return {
      title: 'Referral Network',
      scene: { type: 'network', title: 'Your customers', items: [{ name: names[0], status: 'Happy customer · bought 3 times · rated you 5★' }, { name: names[1], status: 'Open complaint about a late delivery' }, { name: names[2], status: 'Cancelled last month' }, { name: names[3], status: `New referral from ${names[0]}. Nothing known yet` }] },
      rules: ['Ask happy customers for referrals, never upset ones.', 'Treat a referral like any lead: qualify before pitching.', 'Thank the person who referred you.'],
      steps: [
        { id: 'who', type: 'choose', dim: 'understanding', prompt: 'Who should you ask for a referral?', hint: 'Look at each customer’s status.', options: [names[0], names[1], names[2]].map((n, i) => ({ id: `p${i}`, label: n })), correct: ['p0'], explain: 'Happy, repeat customers make the best referrers.' },
        { id: 'ask', type: 'write', dim: 'listening', prompt: `Write a short message asking ${names[0].split(' ')[0]} for a referral.`, hint: 'Thank them first, then ask if they know someone who could benefit.', placeholder: `Hi ${names[0].split(' ')[0]}, …`, groups: [W.thanks, W.intro], need: 2 },
        { id: 'qualify', type: 'choose', pick: 2, dim: 'qualification', prompt: `${names[3]} has been introduced. Which TWO questions qualify them best?`, hint: 'Qualify need and timing before pitching.', options: [{ id: 'a', label: '“What prompted you to look at this now?”' }, { id: 'b', label: '“When would you ideally like a solution in place?”' }, { id: 'c', label: '“Did you know we won an award last year?”' }, { id: 'd', label: '“Can I send you our full price list?”' }], correct: ['a', 'b'], explain: 'Need and timeline first; awards and price lists come later.' },
        { id: 'thank', type: 'choose', dim: 'workflow', prompt: `What do you do for ${names[0].split(' ')[0]} afterwards?`, hint: 'Close the loop with the person who helped you.', options: [{ id: 'a', label: 'Thank them and keep them posted on how it goes' }, { id: 'b', label: 'Nothing, the job is done' }, { id: 'c', label: 'Ask for five more referrals immediately' }], correct: ['a'], explain: 'Thanking referrers builds a network that keeps sending you business.' },
      ],
    }
  },

  8: (pack, fmt) => {
    const { ideal, others, names } = base(pack)
    const n = names[2]
    return {
      title: 'Complaint Desk',
      scene: { type: 'orders', title: `Order history · ${n}`, items: [{ id: 'o1', item: others[0].name, status: 'Delivered on time', total: fmt(others[0].price) }, { id: 'o2', item: ideal.name, status: 'Delivered 9 days late, arrived damaged', total: fmt(ideal.price) }, { id: 'o3', item: others[1]?.name || others[0].name, status: 'Delivered on time', total: fmt(others[1]?.price || others[0].price) }], note: `${n} (upset): “This is unacceptable. I waited over a week and it arrived damaged!”` },
      rules: ['Empathy first, explanations later.', 'Check the facts in the order history.', 'Offer what you are allowed to; escalate what you are not.'],
      steps: [
        { id: 'first', type: 'choose', dim: 'listening', prompt: 'What do you say first?', hint: 'Acknowledge their feelings before anything else.', options: [{ id: 'a', label: '“I’m really sorry. That’s frustrating, and I’ll sort it out with you now.”' }, { id: 'b', label: '“That’s the courier’s fault, not ours.”' }, { id: 'c', label: '“Our policy says delays can happen.”' }], correct: ['a'], explain: 'An apology and ownership calm the conversation.' },
        { id: 'order', type: 'choose', dim: 'understanding', prompt: 'Which order is the complaint about?', hint: 'Look at the status column.', options: [{ id: 'o1', label: others[0].name }, { id: 'o2', label: ideal.name }, { id: 'o3', label: others[1]?.name || others[0].name }], correct: ['o2'], explain: 'Order 2 was late and damaged.' },
        { id: 'fix', type: 'choose', dim: 'objections', prompt: 'You can approve replacements and express delivery. What do you offer?', hint: 'Stay within your authority.', options: [{ id: 'a', label: 'A free replacement with express delivery' }, { id: 'b', label: 'A full refund plus a 50% voucher (needs manager approval)' }, { id: 'c', label: '“There’s nothing I can do.”' }], correct: ['a'], explain: 'Offer what you can approve; bigger compensation needs escalation.' },
        { id: 'route', type: 'match', dim: 'workflow', prompt: 'Handle it yourself, or escalate?', hint: 'Escalate legal, safety or large-money issues.', left: [{ id: 'r1', label: 'Customer wants a replacement' }, { id: 'r2', label: 'Customer says the product injured them' }, { id: 'r3', label: 'Customer asks for compensation above your limit' }], choices: ['Handle myself', 'Escalate to manager'], correct: { r1: 'Handle myself', r2: 'Escalate to manager', r3: 'Escalate to manager' } },
        { id: 'close', type: 'write', dim: 'nextSteps', prompt: `Write your closing message to ${n.split(' ')[0]}.`, hint: 'Apologise, say exactly what happens and when, and invite questions.', placeholder: `${n.split(' ')[0]}, I’m sorry…`, groups: [W.apology, W.commitment, W.checkIn], need: 2 },
      ],
    }
  },

  9: (pack) => {
    const { names, t } = base(pack)
    return {
      title: 'Exhibition Floor',
      scene: { type: 'booths', title: 'Visitors at your stand', items: [{ id: 'v1', name: names[0], line: 'Manager. “We need a solution before next quarter, and I sign off.”' }, { id: 'v2', name: names[1], line: '“Just grabbing a free pen, thanks.”' }, { id: 'v3', name: names[2], line: '“We might look at this next year.”' }, { id: 'v4', name: names[3], line: 'Student researching the industry.' }] },
      rules: ['Time is short. Spend it on the visitors most likely to buy.', 'Open with a question about them, not a pitch.', 'Every good conversation needs a follow-up.'],
      steps: [
        { id: 'rank', type: 'rank', dim: 'qualification', prompt: 'Rank the visitors from highest to lowest priority.', hint: 'Who has need, timeline and authority? Who has none?', items: [{ id: 'v3', label: names[2] }, { id: 'v1', label: names[0] }, { id: 'v4', label: names[3] }, { id: 'v2', label: names[1] }], top: 'v1', bottom: ['v2', 'v4'], explain: `${names[0]} has need, timeline and authority.` },
        { id: 'open', type: 'write', dim: 'listening', prompt: `Write your 10-second opener for ${names[0].split(' ')[0]}.`, hint: 'Ask what brought them to the stand or what they want to solve.', placeholder: 'Hi! What brings you to the stand today?', groups: [W.question, { label: 'Ask about them', re: re('\\b(you|your)') }], need: 2 },
        { id: 'follow', type: 'match', dim: 'nextSteps', prompt: 'Choose a follow-up for each visitor.', hint: 'Match effort to opportunity.', left: [{ id: 'v1', label: names[0] }, { id: 'v3', label: names[2] }, { id: 'v2', label: names[1] }], choices: [`Book a ${t.meeting}`, 'Send info & check in later', 'No follow-up'], correct: { v1: `Book a ${t.meeting}`, v3: 'Send info & check in later', v2: 'No follow-up' } },
      ],
    }
  },

  10: (pack, fmt) => {
    const { ideal } = base(pack)
    const qty = ideal.stock == null ? 40 : pack.id === 'realestate' ? 1 : Math.max(2, Math.min(6, ideal.stock || 6))
    const limit = ideal.maxDiscountPct || 5
    const list = ideal.price * qty
    const budget = Math.round(list * (1 - limit / 200))
    return {
      title: 'Negotiation Desk',
      scene: { type: 'deal', title: 'Deal desk', items: [{ k: 'Product', v: `${qty} × ${ideal.name}` }, { k: 'List total', v: fmt(list) }, { k: 'Customer budget', v: fmt(budget) }, { k: 'Your discount limit', v: `${limit}%` }], note: '“We need 20% off or we’ll go elsewhere.”' },
      rules: ['Never give a discount for nothing. Trade it for something.', `You can approve up to ${limit}%. More needs your manager.`, 'Protect your margin: the smallest discount that works is best.'],
      steps: [
        { id: 'respond', type: 'choose', dim: 'objections', prompt: 'They ask for 20% off. Your best response?', hint: 'Trade, don’t cave.', options: [{ id: 'a', label: '“I can’t do 20%, but if you commit to a longer term or larger order, I can improve the price.”' }, { id: 'b', label: '“Okay, 20% it is.”' }, { id: 'c', label: '“No discounts, take it or leave it.”' }], correct: ['a'], explain: 'Trading a concession for commitment protects value.' },
        { id: 'offer', type: 'calc', dim: 'workflow', prompt: `Build an offer within budget (${fmt(budget)}) without exceeding your ${limit}% limit.`, hint: `Try a discount between ${Math.ceil(limit / 2)}% and ${limit}%.`, unitPrice: ideal.price, quantity: qty, productName: ideal.name, maxDiscount: limit, budget },
        { id: 'beyond', type: 'choose', dim: 'ethics', prompt: 'They push for 3% more than your limit. What do you do?', hint: 'Stay within your authority.', options: [{ id: 'a', label: 'Ask your manager for approval, with a clear business reason' }, { id: 'b', label: 'Agree anyway and hope nobody notices' }, { id: 'c', label: 'Promise extra free products you can’t approve' }], correct: ['a'], explain: 'Approvals exist to protect margin. Use them honestly.' },
        { id: 'confirm', type: 'write', dim: 'nextSteps', prompt: 'Write a short message confirming the agreed deal.', hint: 'Thank them, confirm the total, and say what happens next and when.', placeholder: 'Thanks for…', groups: [W.thanks, W.total, W.date], need: 2 },
      ],
    }
  },

  11: (pack) => {
    const { names } = base(pack)
    return {
      title: 'Corporate Demo',
      scene: { type: 'meeting', title: 'Video meeting', items: [{ name: names[0], role: 'Technical lead' }, { name: names[1], role: 'Finance director' }, { name: names[2], role: 'Operations manager' }] },
      rules: ['Every stakeholder cares about something different.', 'Start with their goals, then show how you help.', 'Answer tough questions with numbers or an offer to calculate.'],
      steps: [
        { id: 'concerns', type: 'match', dim: 'understanding', prompt: 'What does each stakeholder care about most?', hint: 'Think about each person’s job.', left: [{ id: 's1', label: `${names[0]} · Technical lead` }, { id: 's2', label: `${names[1]} · Finance director` }, { id: 's3', label: `${names[2]} · Operations manager` }], choices: ['Integration & security', 'Cost & return on investment', 'Ease of use for the team'], correct: { s1: 'Integration & security', s2: 'Cost & return on investment', s3: 'Ease of use for the team' } },
        { id: 'agenda', type: 'choose', dim: 'listening', prompt: 'How should you open the meeting?', hint: 'Make it about them.', options: [{ id: 'a', label: 'Confirm their goals and what success looks like for each of them' }, { id: 'b', label: 'Start with 20 slides about your company history' }, { id: 'c', label: 'Jump straight to pricing' }], correct: ['a'], explain: 'Agreeing goals first makes the demo relevant.' },
        { id: 'roi', type: 'choose', dim: 'objections', prompt: `${names[1].split(' ')[0]} asks: “What’s the return on this?”`, hint: 'Use their numbers, or offer to calculate together.', options: [{ id: 'a', label: '“Let’s calculate it with your numbers: how many hours a week does this process take today?”' }, { id: 'b', label: '“It’s amazing value, trust me.”' }, { id: 'c', label: '“Every customer gets 10× ROI, guaranteed.”' }], correct: ['a'], explain: 'Real numbers beat hype; guarantees are unverifiable.' },
        { id: 'next', type: 'choose', dim: 'nextSteps', prompt: 'Best next step to agree?', hint: 'Low risk, clear success criteria.', options: [{ id: 'a', label: 'A short pilot with agreed success criteria and a review date' }, { id: 'b', label: 'Ask them to sign today' }, { id: 'c', label: '“Let me know what you think.”' }], correct: ['a'], explain: 'A pilot with criteria makes saying yes easy.' },
      ],
    }
  },

  12: (pack, fmt) => {
    const { ideal, others } = base(pack)
    const qty = ideal.stock == null ? 50 : pack.id === 'realestate' ? 1 : 6
    return {
      title: 'RFQ / Proposal Challenge',
      scene: { type: 'document', title: 'Request for quotation', lines: [`Quantity: ${qty}`, `Requirement 1: ${ideal.specs[0]}`, `Requirement 2: ${ideal.specs[1] || ideal.specs[0]}`, 'Delivery location: (not specified)', 'Submission deadline: 10 working days'] },
      rules: ['Read every requirement before choosing products.', 'Ask about anything unclear, before you quote.', 'Quote within your discount limit and send a clear cover note.'],
      steps: [
        { id: 'product', type: 'choose', dim: 'recommendation', prompt: 'Which product meets the requirements?', hint: 'Compare the RFQ lines with each product’s specs.', options: pack.products.map((p) => ({ id: p.id, label: p.name, detail: p.specs.join(' · ') })), correct: [ideal.id], explain: `${ideal.name} matches both requirements.` },
        { id: 'clarify', type: 'choose', dim: 'qualification', prompt: 'Which line must you clarify before quoting?', hint: 'Look for anything missing.', options: [{ id: 'a', label: 'Delivery location' }, { id: 'b', label: 'Quantity' }, { id: 'c', label: 'Submission deadline' }], correct: ['a'], explain: 'Delivery location changes cost and lead time.' },
        { id: 'quote', type: 'calc', dim: 'workflow', prompt: `Prepare the quotation for ${qty} × ${ideal.name}. Any discount within your limit is fine.`, hint: `Keep the discount at or below ${ideal.maxDiscountPct || 5}%.`, unitPrice: ideal.price, quantity: qty, productName: ideal.name, maxDiscount: ideal.maxDiscountPct || 5, budget: null },
        { id: 'cover', type: 'choose', dim: 'nextSteps', prompt: 'Pick the best proposal cover note.', hint: 'Clear, compliant, with a next step.', options: [{ id: 'a', label: '“Attached is our compliant quotation with datasheets. We confirmed delivery to your site; happy to walk you through it on Tuesday.”' }, { id: 'b', label: '“Price attached. We’re the best, obviously.”' }, { id: 'c', label: '“See attached.”' }], correct: ['a'], explain: 'Show compliance and offer a walkthrough.' },
      ],
    }
  },

  13: (pack, fmt) => {
    const { names } = base(pack)
    const deals = [
      { id: 'd1', name: names[0], stage: 'Proposal', value: fmt(42000), last: '3 days ago', next: 'Review call Tue' },
      { id: 'd2', name: names[1], stage: 'Negotiation', value: fmt(18000), last: '41 days ago', next: '—' },
      { id: 'd3', name: names[2], stage: 'Discovery', value: fmt(9000), last: '2 days ago', next: 'Demo Fri' },
      { id: 'd4', name: names[3], stage: 'Proposal', value: fmt(27000), last: '35 days ago', next: '—' },
    ]
    return {
      title: 'Pipeline Review',
      scene: { type: 'pipeline', title: 'Your pipeline', items: deals },
      rules: ['A deal with no next step and no recent contact is at risk.', 'Only forecast deals with real evidence.', 'Answer your manager with a reason and a plan.'],
      steps: [
        { id: 'risk', type: 'choose', pick: 2, dim: 'qualification', prompt: 'Which TWO deals are at risk?', hint: 'Look at “last contact” and “next step”.', options: deals.map((d) => ({ id: d.id, label: d.name, detail: `${d.stage} · last contact ${d.last} · next: ${d.next}` })), correct: ['d2', 'd4'], explain: 'No next step and over a month of silence.' },
        { id: 'forecast', type: 'choose', dim: 'understanding', prompt: 'Which deal is safest to forecast this month?', hint: 'Late stage AND a booked next step.', options: deals.map((d) => ({ id: d.id, label: d.name, detail: `${d.stage} · next: ${d.next}` })), correct: ['d1'], explain: 'Late stage with a booked review call.' },
        { id: 'plan', type: 'write', dim: 'nextSteps', prompt: `Manager: “Why is ${names[1].split(' ')[0]}’s deal stuck, and what’s your plan?”`, hint: 'Give a reason, then what you will do and when.', placeholder: 'It’s stuck because… I will…', groups: [W.reason, W.plan, W.date], need: 2 },
      ],
    }
  },

  14: (pack) => {
    const { names } = base(pack)
    return {
      title: 'Enterprise Deal',
      scene: { type: 'meeting', title: 'Deal room', items: [{ name: names[0], role: 'Business sponsor' }, { name: names[1], role: 'Procurement' }, { name: names[2], role: 'IT security' }, { name: names[3], role: 'Legal' }] },
      rules: ['Big deals need several people to say yes.', 'Solve conflicts with options, not arguments.', 'Follow a clear order of steps to signature.'],
      steps: [
        { id: 'needs', type: 'match', dim: 'understanding', prompt: 'What does each person need before saying yes?', hint: 'Match each role to its main concern.', left: [{ id: 'a', label: `${names[0]} · Business sponsor` }, { id: 'b', label: `${names[1]} · Procurement` }, { id: 'c', label: `${names[2]} · IT security` }, { id: 'd', label: `${names[3]} · Legal` }], choices: ['Business results', 'Fair price & terms', 'Security review passed', 'Acceptable contract'], correct: { a: 'Business results', b: 'Fair price & terms', c: 'Security review passed', d: 'Acceptable contract' } },
        { id: 'conflict', type: 'choose', dim: 'objections', prompt: 'Procurement wants the cheapest option; the sponsor wants premium features. Best move?', hint: 'Give them choices.', options: [{ id: 'a', label: 'Present good / better / best options with clear trade-offs' }, { id: 'b', label: 'Side with whoever is more senior' }, { id: 'c', label: 'Cut the price of the premium option to the cheapest price' }], correct: ['a'], explain: 'Options let both sides find a yes.' },
        { id: 'terms', type: 'choose', dim: 'ethics', prompt: 'Procurement asks for 15% off and 90-day payment terms. Your policy allows 5% and 60 days.', hint: 'Counter within policy and trade.', options: [{ id: 'a', label: 'Offer 5% and 60 days in exchange for a 2-year commitment' }, { id: 'b', label: 'Accept everything to close faster' }, { id: 'c', label: 'Refuse to negotiate' }], correct: ['a'], explain: 'Stay within policy and trade for commitment.' },
        { id: 'path', type: 'rank', dim: 'workflow', prompt: 'Put the steps to signature in order.', hint: 'Align the sponsor first; signature comes last.', items: [{ id: 'legal', label: 'Legal review' }, { id: 'sig', label: 'Signature' }, { id: 'spons', label: 'Align with business sponsor' }, { id: 'sec', label: 'Security review' }, { id: 'comm', label: 'Commercial agreement' }], top: 'spons', bottom: ['sig'], explain: 'Sponsor first, signature last.' },
      ],
    }
  },

  15: (pack) => {
    const { names, t } = base(pack)
    return {
      title: 'Sales Operations Cockpit',
      scene: { type: 'day', title: 'Today · 9:00', items: [{ id: 't1', label: `Angry ${t.customer} complaint (${names[2]})`, tag: 'Urgent' }, { id: 't2', label: `Hot lead asks for a ${t.meeting} today (${names[0]})`, tag: 'Hot' }, { id: 't3', label: 'Quotation due at 17:00', tag: 'Deadline' }, { id: 't4', label: 'Team newsletter draft', tag: 'Low' }, { id: 't5', label: 'Update CRM notes from yesterday', tag: 'Admin' }] },
      rules: ['Urgent customer issues and hot leads come first.', 'Deadlines matter; low-value tasks can wait.', 'End the day with an up-to-date CRM.'],
      steps: [
        { id: 'order', type: 'rank', dim: 'workflow', prompt: 'Order your day from first to last.', hint: 'Customers and hot leads first, the newsletter last.', items: [{ id: 't4', label: 'Team newsletter draft' }, { id: 't3', label: 'Quotation due at 17:00' }, { id: 't1', label: 'Angry customer complaint' }, { id: 't5', label: 'Update CRM notes' }, { id: 't2', label: 'Hot lead wants a meeting today' }], top: ['t1', 't2'], bottom: ['t4'], explain: 'Handle the upset customer or hot lead first; the newsletter can wait.' },
        { id: 'actions', type: 'match', dim: 'nextSteps', prompt: 'Pick an action for each task.', hint: 'Fast for urgent, scheduled for less urgent.', left: [{ id: 't1', label: 'Angry customer complaint' }, { id: 't2', label: 'Hot lead' }, { id: 't4', label: 'Newsletter draft' }], choices: ['Call now', 'Reply within the hour', 'Schedule for later'], correct: { t1: 'Call now', t2: 'Reply within the hour', t4: 'Schedule for later' } },
        { id: 'reply', type: 'write', dim: 'listening', prompt: `Write a quick reply to the hot lead (${names[0].split(' ')[0]}).`, hint: 'Thank them, offer a time, and ask a question.', placeholder: `Hi ${names[0].split(' ')[0]}, thanks…`, groups: [W.thanks, W.date, W.question], need: 2 },
        { id: 'eod', type: 'choose', dim: 'qualification', prompt: 'Best way to end the day?', hint: 'Tomorrow-you will thank you.', options: [{ id: 'a', label: 'Update the CRM with today’s notes and next steps' }, { id: 'b', label: 'Leave it for Friday' }, { id: 'c', label: 'Only update the deals you’re confident in' }], correct: ['a'], explain: 'A current CRM keeps the whole team informed.' },
      ],
    }
  },
}
