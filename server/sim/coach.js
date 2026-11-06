// Live coaching for Levels 2-4: an objectives checklist and one "next best
// move" tip with an example the player can use. Built only from what the
// player has already discovered, so no hidden facts are revealed.

const FACT_ASK = {
  need: 'Ask what they need it for. What problem are they solving?',
  timeline: 'Ask when they need it by.',
  decision: 'Ask who else is involved in the decision.',
  budget: 'Ask what budget range they have in mind.',
}
const FACT_EXAMPLE = {
  need: 'Before I recommend anything, what will you mainly use it for, and what problem are you trying to solve?',
  timeline: 'Thanks, that helps. When do you need this in place?',
  decision: 'Who else is involved in making the decision?',
  budget: 'So I can suggest the right option, what budget range are you working with?',
}

export function conversationObjectives(s, pack) {
  const c = s.state.customer
  const acts = s.state.actions || []
  const crm = s.state.crm || {}
  const ideal = pack.customer.idealProducts
  const open = c.objectionsRaised.filter((o) => !c.objectionsResolved.includes(o))
  return [
    { id: 'need', label: 'Find out what they need', done: c.revealed.includes('need') },
    { id: 'timeline', label: 'Find out when they need it', done: c.revealed.includes('timeline') },
    { id: 'decision', label: 'Find out who decides', done: c.revealed.includes('decision') },
    { id: 'budget', label: 'Find out their budget', done: c.revealed.includes('budget') },
    { id: 'recommend', label: 'Share a product that fits', done: acts.some((a) => a.type === 'share_product' && ideal.includes(a.productId)) },
    { id: 'concerns', label: 'Answer their concerns', done: c.objectionsRaised.length > 0 && open.length === 0 },
    { id: 'crm', label: 'Save notes in the CRM', done: ['need', 'timeline', 'decision'].filter((k) => (crm[k] || '').length > 2).length >= 2 },
    { id: 'book', label: 'Book a dated next step', done: acts.some((a) => a.type === 'book_next_step') },
  ]
}

export function conversationTip(s, pack, objectives) {
  const c = s.state.customer
  const done = Object.fromEntries(objectives.map((o) => [o.id, o.done]))
  const open = c.objectionsRaised.filter((o) => !c.objectionsResolved.includes(o))
  const first = pack.customer.name.split(' ')[0]

  if (s.state.flags?.length || c.trust < 30)
    return { text: 'Trust is low. Slow down, acknowledge their point and ask a question about their situation.', example: `I’m sorry if that came across as pushy, ${first}. What matters most to you here?` }
  if (open.length) {
    const all = [...pack.customer.objections, pack.customer.callObjection]
    const trigger = all.find((o) => o.id === open[0])?.trigger
    const meeting = pack.terminology.meeting
    const examples = {
      price: 'I understand price matters. Rather than comparing only the price, it’s worth comparing what each option includes, which means you can see the real value side by side.',
      timeline: 'That’s a fair concern. I’ve checked availability, and I’ll confirm the exact date in writing so you can plan around it.',
      product: `Good question. I’ll send you the full details and specifications, and you’re welcome to see it for yourself at a ${meeting} before deciding.`,
      decision: `That makes sense. Let’s include them: we could set up a short ${meeting} so everyone can ask their questions directly.`,
    }
    return {
      text: 'They raised a concern. Acknowledge it, then give a concrete reason or fact (no discounts).',
      example: examples[trigger] || `That’s a fair concern, and I understand. Could we go through it together at a short ${meeting}, so I can answer it with the details in front of us?`,
    }
  }
  for (const f of ['need', 'timeline', 'decision', 'budget']) {
    if (!done[f]) return { text: FACT_ASK[f], example: FACT_EXAMPLE[f] }
  }
  if (!done.recommend) return { text: 'You know enough. Open Products, check availability, then Share card for the option that fits what they told you.', example: null }
  if (!done.crm) return { text: 'Save what you learned on the CRM tab: need, timeline and decision maker.', example: null }
  if (!done.book && c.agreedNextStep) return { text: 'They said yes! Open the Book tab, pick the type, date and time, and click “Book & send invite”.', example: null }
  if (!done.book) {
    const step = pack.nextStepTypes[0].toLowerCase()
    return { text: `Propose a ${step} with a day and time. When they agree, book it on the Book tab.`, example: `Would it work to set up a ${step} on Saturday at 11am?` }
  }
  return { text: 'Great work. Every objective is complete. Click “Finish & get coaching”.', example: null }
}

export function triageObjectives(s, pack) {
  const st = s.state
  const contacted = new Set(s.transcript.filter((m) => m.from === 'player' && m.leadId).map((m) => m.leadId))
  return [
    { id: 'research', label: 'Research at least one low-information lead', done: st.researchLeft < 5 },
    { id: 'contact', label: 'Message at least 3 different leads', done: contacted.size >= 3 },
    { id: 'stages', label: 'Set a CRM stage for 3+ leads', done: Object.keys(st.crm || {}).length >= 3 },
    { id: 'rank', label: 'Rank leads by the evidence you found', done: st.phase !== 'investigate' },
    { id: 'manager', label: 'Answer your manager', done: st.phase === 'ready' },
  ]
}

export function triageTip(s, pack, objectives) {
  const done = Object.fromEntries(objectives.map((o) => [o.id, o.done]))
  if (!done.research) return { text: 'Leads with almost no information can hide big deals. Click a vague lead and press “Research company”.', example: null }
  if (!done.contact) return { text: 'Select a lead and ask about their need and timeline. Watch the evidence boxes fill in.', example: 'Thanks for reaching out! What are you hoping to solve, and when do you need it?' }
  if (!done.stages) return { text: 'Set a CRM stage for each lead you’ve learned about: “qualified” if they have need and timeline, “nurture” if not yet.', example: null }
  if (!done.rank) return { text: 'Use ▲▼ to put the leads with the strongest evidence on top, write one or two sentences why, then submit.', example: 'My #1 is ___ because they have a clear need and timeline. #2 is ___ because ___.' }
  if (!done.manager) return { text: 'Your manager asked a question. Reply with your evidence and how you’d confirm anything uncertain.', example: 'Fair question. I ranked ___ first because ___. I’ll confirm ___ with a quick call.' }
  return { text: 'All done. Click “Finish & get coaching”.', example: null }
}

export { RULES } from '../../src/training/rules.js'
