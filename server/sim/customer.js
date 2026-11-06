import Anthropic from '@anthropic-ai/sdk'

// Customer dialogue. With ANTHROPIC_API_KEY set, Claude role-plays the customer
// and proposes bounded state changes as structured JSON. Without a key (or if
// the call fails) a scripted engine answers from the same hidden facts, so the
// mission always works. The UI shows which engine replied.

const MODEL = 'claude-opus-5-5'
let client = null
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY
const getClient = () => (client ||= new Anthropic())

const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    trust_delta: { type: 'integer' },
    intent_delta: { type: 'integer' },
    urgency_delta: { type: 'integer' },
    revealed: { type: 'array', items: { type: 'string', enum: ['need', 'budget', 'timeline', 'decision', 'competitor'] } },
    raised_objection: { type: 'string' },
    resolved_objection: { type: 'string' },
    agrees_to_next_step: { type: 'boolean' },
  },
  required: ['reply', 'trust_delta', 'intent_delta', 'urgency_delta', 'revealed', 'raised_objection', 'resolved_objection', 'agrees_to_next_step'],
  additionalProperties: false,
}

async function callClaude({ system, messages, schema, maxTokens = 1200 }) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
    system,
    messages,
  })
  if (response.stop_reason === 'refusal') throw new Error('refusal')
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  return schema ? JSON.parse(text) : text.trim()
}

function customerSystem({ pack, persona, channel, level, state, memory, objections }) {
  return `You are role-playing a customer in a sales-training simulation. Stay in character; never mention AI, simulations or training.

Seller: ${pack.seller}, ${pack.sellerBlurb}.
You are ${persona.name} (${persona.role}). Personality: ${persona.personality}
Channel: ${channel}. ${level === 3 ? 'This is a live phone call: speak naturally, 1-3 short sentences, no emojis or lists.' : 'Write like a real message: 1-3 short sentences.'}
Hidden motivation (never state it outright; reveal facts only when the seller asks good, relevant questions or earns trust):
${persona.hiddenMotivation}
Facts you may reveal, by id:
${Object.entries(persona.facts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Possible objections, by id (raise at most one per turn, when it fits naturally):
${objections.map((o) => `- ${o.id}: ${o.text}`).join('\n')}
${memory ? `What you remember from earlier contact with this seller:\n${memory}\n` : ''}
Current state (0-100): trust ${state.trust}, buying intent ${state.intent}, urgency ${state.urgency}. Already revealed: ${state.revealed.join(', ') || 'nothing'}. Objections raised: ${state.objectionsRaised.join(', ') || 'none'}; resolved: ${state.objectionsResolved.join(', ') || 'none'}.

React like a real person: pushy, vague or exaggerated claims reduce trust; listening, honesty and relevant recommendations increase it. Product cards and system notes appear in brackets.
Return JSON: reply text; trust/intent/urgency deltas between -15 and 15; "revealed" lists fact ids you actually disclose in this reply; "raised_objection" / "resolved_objection" are objection ids or "" ; "agrees_to_next_step" true only if you accept a concrete, dated next step the seller proposed.`
}

const toApiMessages = (history) => {
  const msgs = []
  for (const m of history.slice(-24)) {
    const role = m.from === 'customer' ? 'assistant' : 'user'
    const text = m.from === 'system' ? `[${m.text}]` : m.text
    if (msgs.length && msgs.at(-1).role === role) msgs.at(-1).content += `\n${text}`
    else msgs.push({ role, content: text })
  }
  if (msgs[0]?.role === 'assistant') msgs.unshift({ role: 'user', content: '[Conversation opened]' })
  if (msgs.at(-1)?.role === 'assistant') msgs.push({ role: 'user', content: '[The seller is waiting for your reply]' })
  return msgs
}

export async function customerReply(ctx) {
  if (aiEnabled()) {
    try {
      const out = await callClaude({ system: customerSystem(ctx), messages: toApiMessages(ctx.history), schema: REPLY_SCHEMA })
      return { ...out, engine: 'claude' }
    } catch (err) {
      console.error('Claude customer reply failed, using scripted engine:', err.message)
    }
  }
  return { ...scriptedReply(ctx), engine: 'scripted' }
}

// ---- Scripted fallback ----

const pick = (arr, seed) => arr[seed % arr.length]

function scriptedReply({ persona, state, analysis, event, objections, level }) {
  const out = { trust_delta: 0, intent_delta: 0, urgency_delta: 0, revealed: [], raised_objection: '', resolved_objection: '', agrees_to_next_step: false }
  const parts = []
  const seed = state.revealed.length + state.objectionsRaised.length + (analysis?.words || 0)

  if (event?.type === 'share_product') {
    const ideal = persona.idealProducts.includes(event.productId)
    if (ideal && state.revealed.includes('need')) {
      parts.push(pick(['Oh, that actually sounds like what I need.', 'That could really work for us.'], seed))
      out.trust_delta = 8
      out.intent_delta = 12
    } else if (ideal) {
      parts.push('Interesting… but how do you know that suits me?')
      out.intent_delta = 5
    } else {
      parts.push(pick(['Hmm, I am not sure that is quite right for me.', 'That is not really what I had in mind.'], seed))
      out.trust_delta = -3
    }
    const o = objections.find((x) => x.trigger === 'product' && !state.objectionsRaised.includes(x.id))
    if (o && ideal) (parts.push(o.text), (out.raised_objection = o.id))
    return { ...out, reply: parts.join(' ') }
  }
  if (event?.type === 'quote') {
    parts.push(`Thanks for the quote of ${event.totalLabel}.`)
    const o = objections.find((x) => x.trigger === 'price' && !state.objectionsRaised.includes(x.id))
    if (o) (parts.push(o.text), (out.raised_objection = o.id))
    else parts.push('That is within what we discussed.'), (out.intent_delta = 8)
    return { ...out, reply: parts.join(' ') }
  }

  const a = analysis
  if (a.pressure.length || a.falseClaims.length) {
    return { ...out, trust_delta: -10, intent_delta: -5, reply: pick(['That feels a bit pushy, honestly.', 'I don’t like being rushed into things.', 'Hm, that sounds too good to be true.'], seed) }
  }

  // Resolve an open objection when the seller acknowledges it and adds substance.
  const open = state.objectionsRaised.filter((id) => !state.objectionsResolved.includes(id))
  if (open.length && (a.empathy || a.value) && a.words >= 12) {
    out.resolved_objection = open[0]
    out.trust_delta += 8
    out.intent_delta += 6
    parts.push(pick(['Okay, that is a fair answer.', 'That helps, thank you.', 'Right, that makes me feel better about it.'], seed))
  }

  // Reveal facts the seller asked about (needs some trust for sensitive ones).
  const order = ['need', 'timeline', 'decision', 'budget', 'competitor']
  for (const t of order) {
    if (!a.topics.includes(t) || state.revealed.includes(t)) continue
    if ((t === 'budget' || t === 'competitor') && state.trust < 25) {
      parts.push('I’d rather not get into numbers yet.')
      continue
    }
    out.revealed.push(t)
    parts.push(persona.facts[t])
    if (out.revealed.length >= 2) break
  }
  if (a.openQuestion && out.revealed.length) out.trust_delta += 4

  // Raise an objection when the topic comes up.
  if (!out.raised_objection) {
    const trig = a.mentionsPrice ? 'price' : out.revealed.includes('timeline') ? 'timeline' : out.revealed.includes('decision') ? 'decision' : null
    const o = trig && objections.find((x) => x.trigger === trig && !state.objectionsRaised.includes(x.id))
    if (o) (parts.push(o.text), (out.raised_objection = o.id))
  }

  if (a.nextStep) {
    if (state.trust + out.trust_delta >= 40 && state.revealed.length + out.revealed.length >= 1) {
      out.agrees_to_next_step = true
      out.intent_delta += 10
      parts.push(pick(['Yes, let’s do that. Please send me the details.', 'Okay, that works for me.'], seed))
    } else {
      parts.push('Maybe… I’m not sure yet. I still have questions.')
    }
  }

  // On a call, the customer brings up the reason they called early on.
  const callObjection = level === 3 && objections.find((o) => !o.trigger)
  if (callObjection && !out.raised_objection && !state.objectionsRaised.includes(callObjection.id) && a.words >= 4) {
    parts.push(callObjection.text)
    out.raised_objection = callObjection.id
  }

  if (!parts.length) {
    if (a.words < 4) parts.push(level === 3 ? 'Sorry, could you say a bit more?' : 'Sorry, what do you mean?')
    else if (a.mentionsPrice) parts.push('Okay. And what would that include?')
    else parts.push(pick(['Okay… so what would you suggest for me?', 'I see. What else should I know?', 'Hmm, go on.'], seed))
  }
  return { ...out, reply: parts.join(' ') }
}

// ---- Lead replies (Level 4) ----

const LEAD_TOPICS = ['productFit', 'need', 'intent', 'timeline', 'decision']

export async function leadReply({ pack, lead, asked, alreadyKnown, question }) {
  const reveal = asked.filter((d) => LEAD_TOPICS.includes(d) && !alreadyKnown.includes(d)).slice(0, 2)
  if (!reveal.length && !alreadyKnown.includes('need')) reveal.push('need')
  const facts = reveal.map((d) => lead.dims[d].fact)
  if (aiEnabled()) {
    try {
      const text = await callClaude({
        system: `You are ${lead.name} (${lead.company}), a sales lead replying to ${pack.seller}. Reply in 1-3 natural sentences, in character. Include ONLY these facts, in your own words: ${facts.join(' ') || 'nothing new; politely ask what they need from you'}. Do not invent other details.`,
        messages: [{ role: 'user', content: question }],
        maxTokens: 400,
      })
      return { reply: text, revealed: reveal, engine: 'claude' }
    } catch (err) {
      console.error('Claude lead reply failed:', err.message)
    }
  }
  return { reply: facts.join(' ') || 'Thanks for reaching out. What would you like to know?', revealed: reveal, engine: 'scripted' }
}

// ---- Manager challenge & coaching narrative ----

export async function managerChallenge({ pack, ranking, table, justification }) {
  const top = table.find((r) => r.id === ranking[0])
  const weakTop = table.filter((r) => ranking.indexOf(r.id) <= 1 && r.confidence < 40)
  const ignored = table.filter((r) => r.confidence === 0)
  const lines = []
  if (weakTop.length) lines.push(`You put ${weakTop.map((r) => r.name).join(' and ')} near the top with under 40% evidence. What makes you confident?`)
  if (ignored.length) lines.push(`You never contacted ${ignored.map((r) => r.name).join(', ')}. How do you know they aren’t worth more than they look?`)
  if (!lines.length) lines.push(`Why is ${top?.name} worth more of your time this week than #2? Which evidence would change your mind?`)
  const fallback = lines.join(' ')
  if (!aiEnabled()) return { text: fallback, engine: 'scripted' }
  try {
    const text = await callClaude({
      system: `You are a sharp but fair sales manager at ${pack.seller}. Challenge the rep's lead ranking in 2-3 sentences, based only on the evidence table. Ask one pointed question. No praise padding.`,
      messages: [{ role: 'user', content: `Ranking: ${ranking.join(' > ')}\nEvidence table: ${JSON.stringify(table)}\nRep's justification: ${justification || '(none)'}\nKey concerns: ${fallback}` }],
      maxTokens: 500,
    })
    return { text, engine: 'claude' }
  } catch {
    return { text: fallback, engine: 'scripted' }
  }
}

export async function coachNarrative({ evaluation, transcript }) {
  if (!aiEnabled()) return null
  try {
    return await callClaude({
      system:
        'You are a sales coach. Write a 3-4 sentence debrief for the learner, in second person. Quote their actual words as evidence. Do not reward pressure tactics, fake scarcity or false claims. Be specific and kind.',
      messages: [
        {
          role: 'user',
          content: `Rubric scores: ${JSON.stringify(evaluation.dims.map((d) => ({ [d.label]: d.score })))}\nTranscript:\n${transcript
            .filter((m) => m.from !== 'system')
            .map((m) => `${m.from === 'player' ? 'Learner' : 'Customer'}: ${m.text}`)
            .join('\n')
            .slice(-6000)}`,
        },
      ],
      maxTokens: 700,
    })
  } catch {
    return null
  }
}
