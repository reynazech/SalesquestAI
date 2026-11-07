// Optional coaching hints with copy-paste example messages.
// They use only what the player can already see (names, channel, tools),
// never the customer's hidden facts.

const vars = {
  retail: {
    discover: 'what you will mostly use it for, and when you need it by',
    them: 'them',
    proof: 'You are very welcome to try it in the showroom before deciding, and I will confirm the exact delivery date in writing.',
    nextStep: 'come to the showroom on Saturday at 11am to try it together',
    stepType: 'Showroom visit',
    units: 'pieces',
  },
  saas: {
    discover: 'where your team is losing the most time today, and what that is costing you',
    them: 'your team',
    proof: 'I can share our security documentation and a realistic onboarding plan, so IT and your team can judge the effort themselves.',
    nextStep: 'book a 30-minute tailored demo on Thursday at 2pm with you and whoever signs off the budget',
    stepType: 'Tailored demo',
    units: 'users',
  },
  realestate: {
    discover: 'what matters most in your next home, and when you need to move',
    them: 'your family',
    proof: 'I will send the commute times, service charges and building details in writing, so you can both check them before a viewing.',
    nextStep: 'arrange a viewing on Saturday at 10am, with anyone who can’t attend joining by video',
    stepType: 'Property viewing',
    units: 'units',
  },
  industrial: {
    discover: 'what duty each unit needs to deliver, and what the application is',
    them: 'procurement',
    proof: 'I will send the test certificates and datasheets with the quotation, so you can check them against your specification.',
    nextStep: 'book a technical clarification call on Tuesday at 10am with you and procurement',
    stepType: 'Technical clarification call',
    units: 'units',
  },
}

const avoid = [
  'Pressure lines: “only today”, “last one”, “buy now”, “prices go up”.',
  'Unverifiable claims: “guaranteed”, “best in the market”, “never fails”.',
  'Recommending or quoting before you understand the need.',
  'Leading with a discount when price comes up.',
  'Very long messages (90+ words). Keep it conversational.',
  'CRM entries the customer never actually told you.',
]

export function hintsFor(level, packId, customerName = 'there') {
  const v = vars[packId] || vars.retail
  const first = customerName.split(' ')[0]

  if (level === 2)
    return {
      intro: 'Discover first, recommend second, then agree a dated next step.',
      steps: [
        { title: 'Ask before you pitch', tip: 'Open questions (what / how / when / who) uncover the real need.', examples: [`Hi ${first}, thanks for getting in touch. Before I recommend anything, could you tell me ${v.discover}?`] },
        { title: 'Timeline and decision process', tip: 'Find out the deadline and who else decides.', examples: ['Thanks, that helps. When do you need this in place, and who else is involved in the decision?'] },
        { title: 'Budget, once there’s some trust', tip: 'Customers share numbers more readily after a couple of good questions.', examples: ['So I can suggest the right option, what budget range are you working with?'] },
        { title: 'Check, then recommend', tip: 'Use Check availability first, then Share card for the option whose specs fit what they told you.', examples: ['Based on what you’ve told me, I’d suggest this option, because it matches your requirement and I’ve checked it is available in time.'] },
        { title: 'Handle concerns with evidence', tip: 'Acknowledge, then add a concrete reason. Don’t reach for a discount.', examples: [`That’s a fair concern. ${v.proof}`, 'I understand price matters. Rather than comparing only the price, it’s worth comparing what each option includes and when it arrives.'] },
        { title: 'Agree a dated next step', tip: `Propose an action with a day and time, then book it on the Book tab (${v.stepType}).`, examples: [`Would it work to ${v.nextStep}?`] },
        { title: 'Keep the CRM honest', tip: 'Record only what the customer said. Set the stage to “qualified” once you know need, timeline and decision process.', examples: [] },
      ],
      avoid,
    }

  if (level === 3)
    return {
      intro: 'Short spoken sentences. Listen for the reason they called, answer it with evidence, then book.',
      steps: [
        { title: 'Pick up where you left off', tip: 'Show you remember the earlier conversation (see “From your earlier chat”).', examples: [`Hi ${first}, thanks for calling back. Last time we talked about your requirements. What has changed since then?`] },
        { title: 'Explore the concern', tip: 'Let them explain before you answer.', examples: [`That’s a fair concern. Can you tell me a bit more about what is worrying ${v.them}?`] },
        { title: 'Answer with evidence', tip: 'Acknowledge, then give something checkable.', examples: [`I understand. ${v.proof}`] },
        { title: 'Check who else decides', tip: 'Make sure every decision-maker is comfortable.', examples: ['Who else needs to feel comfortable with this before you go ahead?'] },
        { title: 'Book the next step', tip: `Ask with a day and time, then use the Book tab (${v.stepType}).`, examples: [`Would it work to ${v.nextStep}?`] },
        { title: 'Take notes as you go', tip: 'Jot objections and commitments in Call notes; update the CRM before you hang up.', examples: [] },
      ],
      avoid,
    }

  return {
    intro: 'Rank by evidence, not first impressions. You have 12 messages: spend them where you know least.',
    steps: [
      { title: 'Don’t trust the surface', tip: 'A one-word comment or a personal email can hide a large account. Use Research on the least-known leads.', examples: [] },
      { title: 'Qualify need and fit', tip: 'Send to the selected lead.', examples: [`Thanks for reaching out! What are you hoping to solve, and roughly how many ${v.units} would this involve?`], target: 'message' },
      { title: 'Timeline and decision', tip: 'Send to the selected lead.', examples: ['When are you hoping to decide, and who else is involved in the choice?'], target: 'message' },
      { title: 'Justify your ranking', tip: 'Fill the blanks with the evidence you found.', examples: ['My #1 is ___ because I have evidence of strong need and fit (___) and a timeline of ___. #2 is ___: ready to buy, but smaller value. I still need to confirm ___ for ___.'], target: 'justification' },
      { title: 'Answer the manager', tip: 'Defend what the evidence supports, and say how you would close the gaps.', examples: ['Fair challenge. My ranking of ___ rests on ___. To raise my confidence, I would verify ___ by contacting ___ before committing more time.'], target: 'reply' },
    ],
    avoid: avoid.filter((a, i) => i !== 3),
  }
}
