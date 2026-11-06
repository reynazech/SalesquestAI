// Fictional industry packs for the simulation levels. All companies, people,
// products and prices are invented for training. Prices are in USD and
// converted for display by region (see currency.js).
//
// Hidden fields (motivation, facts, lead dimensions) never leave the server
// until the player discovers them.

export const packs = {
  retail: {
    id: 'retail',
    label: 'Retail & e-commerce',
    seller: 'Northwind Living',
    sellerBlurb: 'a mid-size home furniture retailer with two showrooms and an online store',
    terminology: { deal: 'order', customer: 'shopper', meeting: 'showroom visit', pipeline: 'leads' },
    inbox: { social: 'Instagram DMs', default: 'WhatsApp Business' },
    call: 'Phone call',
    nextStepTypes: ['Showroom visit', 'Home measurement visit', 'Video walkthrough', 'Delivery booking'],
    products: [
      { id: 'haven-sofa', name: 'Haven 3-Seater Sofa', price: 899, maxDiscountPct: 10, stock: 4, leadDays: 5, specs: ['Grey performance fabric', '214 cm wide', 'Removable covers'], tags: ['sofa', 'grey'] },
      { id: 'haven-sofabed', name: 'Haven Sofa Bed', price: 1099, maxDiscountPct: 8, stock: 2, leadDays: 7, specs: ['Pull-out queen mattress', '220 cm wide', 'Same grey fabric as Haven'], tags: ['sofa bed', 'guests', 'sleeper'] },
      { id: 'atlas-recliner', name: 'Atlas Recliner Chair', price: 549, maxDiscountPct: 12, stock: 9, leadDays: 3, specs: ['Power recline', 'USB charging', 'Leather-look'], tags: ['chair', 'recliner'] },
      { id: 'linen-cushions', name: 'Linen Cushion Set (4)', price: 79, maxDiscountPct: 15, stock: 40, leadDays: 2, specs: ['Washable linen', '45 × 45 cm'], tags: ['cushions', 'accessory'] },
    ],
    customer: {
      name: 'Maya Rahman',
      handle: '@maya.makes.home',
      role: 'Shopper furnishing a new apartment',
      personality: 'Friendly and chatty, but cautious with money. Hates pushy sellers.',
      hiddenMotivation:
        'She is moving into a new two-bedroom apartment in three weeks. Her parents stay over often, so she secretly needs a sofa that becomes a bed. She has seen a CasaHome sofa bed on sale.',
      opening: 'Hi! Is the grey sofa from your reel still available? How much is it? 😊',
      facts: {
        need: 'My parents visit a lot and stay over, so honestly I need somewhere for them to sleep too.',
        budget: 'I was hoping to keep it around {{$1100}} at most.',
        timeline: 'I move in on the 20th, so roughly three weeks from now.',
        decision: 'My partner and I decide together, he wants to see it before we pay.',
        competitor: 'CasaHome has a sofa bed on sale at 15% off right now.',
      },
      objections: [
        { id: 'price', trigger: 'price', text: 'Hmm, CasaHome has a sofa bed that is 15% cheaper though…' },
        { id: 'delivery', trigger: 'timeline', text: 'Would it actually arrive before the 20th? I cannot be without a sofa when my parents come.' },
        { id: 'comfort', trigger: 'product', text: 'Are sofa bed mattresses comfortable? The last one I had was terrible.' },
      ],
      idealProducts: ['haven-sofabed'],
      callGoal: 'Maya calls back the next day. Her partner is worried the sofa bed mattress will be uncomfortable for her parents.',
      callObjection: { id: 'partner', text: 'My partner thinks the mattress will be too thin for my parents. Can you help me convince him?' },
    },
    leads: [
      {
        id: 'L1', name: 'Priya S.', company: '@dxb.interiors.studio', source: 'Instagram comment: "price?"', valueUsd: 38000, gem: true,
        profile: 'Comment on the Haven Sofa post. Small account, 2 posts, business category: Interior design.',
        dims: {
          productFit: { v: 0.9, fact: 'We furnish serviced apartments, and the Haven range matches our client brief.' },
          need: { v: 0.9, fact: 'We are fitting out 40 serviced apartments for a hotel group.' },
          intent: { v: 0.8, fact: 'We are choosing a supplier this month.' },
          timeline: { v: 0.7, fact: 'Handover is in 10 weeks.' },
          decision: { v: 0.6, fact: 'I shortlist, the hotel’s procurement team signs the order.' },
          engagement: { v: 0.5, fact: 'Replied within an hour.' },
        },
        known: ['engagement'],
      },
      {
        id: 'L2', name: 'Omar & Lina', company: 'Walk-in couple', source: 'Showroom visit (Saturday)', valueUsd: 550,
        profile: 'Sat in the Atlas Recliner for 10 minutes and asked about colours.',
        dims: {
          productFit: { v: 0.9, fact: 'It is for the living room, the Atlas in tan is perfect.' },
          need: { v: 0.6, fact: 'Our old chair broke.' },
          intent: { v: 0.9, fact: 'We want to buy this weekend.' },
          timeline: { v: 0.9, fact: 'As soon as possible.' },
          decision: { v: 0.9, fact: 'We both decide, we agree already.' },
          engagement: { v: 0.9, fact: 'Very responsive.' },
        },
        known: ['productFit', 'engagement'],
      },
      {
        id: 'L3', name: 'Karan M.', company: 'Website cart', source: 'Abandoned cart: Haven Sofa Bed', valueUsd: 1099,
        profile: 'Added the Haven Sofa Bed to cart twice, asked chatbot for a discount code.',
        dims: {
          productFit: { v: 0.8, fact: 'The sofa bed is what I want.' },
          need: { v: 0.6, fact: 'For a guest room.' },
          intent: { v: 0.6, fact: 'I will buy if the price is right.' },
          timeline: { v: 0.4, fact: 'No rush, maybe next month.' },
          decision: { v: 0.8, fact: 'It is my decision.' },
          engagement: { v: 0.5, fact: 'Replies slowly.' },
        },
        known: ['productFit'],
      },
      {
        id: 'L4', name: 'Grace T.', company: 'Returning customer', source: 'WhatsApp', valueUsd: 79,
        profile: 'Bought a Haven Sofa last year. Asking about cushion colours.',
        dims: {
          productFit: { v: 0.9, fact: 'Just the cushion set.' },
          need: { v: 0.4, fact: 'Want to refresh the look.' },
          intent: { v: 0.8, fact: 'Will order today if grey is in stock.' },
          timeline: { v: 0.8, fact: 'This week.' },
          decision: { v: 1, fact: 'My decision.' },
          engagement: { v: 0.9, fact: 'Very responsive.' },
        },
        known: ['productFit', 'decision', 'engagement'],
      },
      {
        id: 'L5', name: 'Ben A.', company: 'Facebook lead form', source: 'Facebook ad: "Spring catalogue"', valueUsd: 1500,
        profile: 'Downloaded the catalogue. No message.',
        dims: {
          productFit: { v: 0.5, fact: 'Just browsing ideas.' },
          need: { v: 0.3, fact: 'Might redecorate eventually.' },
          intent: { v: 0.2, fact: 'Not buying yet.' },
          timeline: { v: 0.1, fact: 'Probably next year when we move.' },
          decision: { v: 0.5, fact: 'Not sure yet.' },
          engagement: { v: 0.3, fact: 'Short replies.' },
        },
        known: [],
      },
    ],
  },

  saas: {
    id: 'saas',
    label: 'SaaS / IT',
    seller: 'Brightpath Software',
    sellerBlurb: 'maker of FlowDesk, a workflow and reporting platform for operations teams',
    terminology: { deal: 'deal', customer: 'prospect', meeting: 'demo', pipeline: 'pipeline' },
    inbox: { social: 'LinkedIn messages', default: 'Website demo-request chat' },
    call: 'Discovery call',
    nextStepTypes: ['Tailored demo', 'Technical workshop', 'Pilot kickoff', 'Pricing review with finance'],
    products: [
      { id: 'starter', name: 'FlowDesk Starter', price: 12, unit: 'user / month', maxDiscountPct: 0, stock: null, leadDays: 1, specs: ['Task boards', 'Basic dashboards', 'Up to 25 users'], tags: ['small team', 'basic'] },
      { id: 'team', name: 'FlowDesk Team', price: 24, unit: 'user / month', maxDiscountPct: 15, stock: null, leadDays: 7, specs: ['Automations', 'Slack & Xero integrations', 'Unlimited users'], tags: ['automation', 'integrations', 'slack', 'xero'] },
      { id: 'business', name: 'FlowDesk Business', price: 39, unit: 'user / month', maxDiscountPct: 15, stock: null, leadDays: 14, specs: ['Everything in Team', 'SSO & audit log', 'Dedicated onboarding'], tags: ['sso', 'security', 'enterprise'] },
      { id: 'reporting', name: 'Automated Reporting add-on', price: 6, unit: 'user / month', maxDiscountPct: 10, stock: null, leadDays: 3, specs: ['Scheduled reports', 'Spreadsheet sync', 'Executive summaries'], tags: ['reporting', 'reports', 'spreadsheet'] },
    ],
    customer: {
      name: 'Daniel Okafor',
      handle: 'Head of Operations, Kestrel Freight',
      role: 'Head of Operations at a 60-person freight forwarder',
      personality: 'Direct, time-poor, technical enough to spot vague answers. Respects honesty.',
      hiddenMotivation:
        'His team spends about 8 hours every week building reports by hand, and the CEO wants weekly numbers before Q1 planning. He is also trialling TaskFlow, which is cheaper.',
      opening: 'Hi, I filled in the demo form. Quick question first: do you integrate with Xero and Slack?',
      facts: {
        need: 'My leads lose about 8 hours a week pulling numbers into spreadsheets for the weekly report.',
        budget: 'Anything over about {{$1500}} a month needs our CFO’s approval.',
        timeline: 'We want something running before Q1 planning, so within about 6 weeks.',
        decision: 'I choose the tool, but our CFO Helen signs off and IT reviews security.',
        competitor: 'We are also trialling TaskFlow, and it is cheaper per user.',
      },
      objections: [
        { id: 'price', trigger: 'price', text: 'TaskFlow is about 20% cheaper per user. Why would we pay more?' },
        { id: 'effort', trigger: 'product', text: 'My team has no time for a big rollout. How much work is setup?' },
        { id: 'security', trigger: 'timeline', text: 'IT will ask about security. Do you have SSO?' },
      ],
      idealProducts: ['team', 'reporting'],
      callGoal: 'Daniel agreed to a call. Since the chat, IT has asked about single sign-on and data security.',
      callObjection: { id: 'it', text: 'Our IT lead says we need SSO, and that is only in your Business tier, which blows the budget.' },
    },
    leads: [
      {
        id: 'L1', name: 'J. Mensah', company: 'j.mensah@gmail.com', source: 'Free trial sign-up', valueUsd: 260000, gem: true,
        profile: 'Personal email. Created 1 board, invited nobody. Logged in twice.',
        dims: {
          productFit: { v: 0.9, fact: 'I am testing it for our regional operations team, the automations look right.' },
          need: { v: 0.9, fact: 'Our group has 900 ops staff on spreadsheets and the board wants that fixed.' },
          intent: { v: 0.7, fact: 'We are shortlisting two vendors this quarter.' },
          timeline: { v: 0.6, fact: 'Decision by end of next quarter.' },
          decision: { v: 0.5, fact: 'I lead the evaluation; the COO and procurement decide.' },
          engagement: { v: 0.4, fact: 'Replies the next day.' },
        },
        known: [],
      },
      {
        id: 'L2', name: 'Aisha Noor', company: 'Northlight Agency (35 staff)', source: 'Demo request', valueUsd: 10000,
        profile: 'Requested a demo for "team workload planning". Uses Slack.',
        dims: {
          productFit: { v: 0.8, fact: 'We need workload planning with Slack alerts.' },
          need: { v: 0.8, fact: 'Projects keep slipping because no one sees capacity.' },
          intent: { v: 0.8, fact: 'We have budget approved for a tool.' },
          timeline: { v: 0.8, fact: 'Want to start in January.' },
          decision: { v: 0.8, fact: 'Me and our MD.' },
          engagement: { v: 0.9, fact: 'Very quick replies.' },
        },
        known: ['productFit', 'engagement'],
      },
      {
        id: 'L3', name: 'Tom Reyes', company: 'Stealth startup (3 people)', source: 'Pricing page chat', valueUsd: 430,
        profile: 'Asked whether there is a free plan for startups.',
        dims: {
          productFit: { v: 0.5, fact: 'We just need simple task boards.' },
          need: { v: 0.4, fact: 'Trello is getting messy.' },
          intent: { v: 0.5, fact: 'Only if it is free or very cheap.' },
          timeline: { v: 0.5, fact: 'Whenever.' },
          decision: { v: 1, fact: 'I am the founder.' },
          engagement: { v: 0.7, fact: 'Responsive.' },
        },
        known: ['decision'],
      },
      {
        id: 'L4', name: 'Grace Liu', company: 'Kestrel Freight (existing customer)', source: 'Support ticket mention', valueUsd: 4300,
        profile: 'Existing Team customer. Mentioned reporting pain in a support ticket.',
        dims: {
          productFit: { v: 0.9, fact: 'The reporting add-on is exactly what we lack.' },
          need: { v: 0.7, fact: 'Month-end reports take two days.' },
          intent: { v: 0.6, fact: 'Would consider adding it.' },
          timeline: { v: 0.5, fact: 'After the busy season.' },
          decision: { v: 0.7, fact: 'Needs Daniel’s OK.' },
          engagement: { v: 0.6, fact: 'Replies in a day.' },
        },
        known: ['productFit'],
      },
      {
        id: 'L5', name: 'Sam Patel', company: 'University student', source: 'Webinar sign-up', valueUsd: 0,
        profile: 'Registered for the "Ops automation" webinar with a .edu email.',
        dims: {
          productFit: { v: 0.2, fact: 'It is for my dissertation research.' },
          need: { v: 0.1, fact: 'Just learning.' },
          intent: { v: 0, fact: 'No plans to buy.' },
          timeline: { v: 0, fact: 'None.' },
          decision: { v: 0.2, fact: 'Not applicable.' },
          engagement: { v: 0.8, fact: 'Very chatty.' },
        },
        known: [],
      },
    ],
  },

  realestate: {
    id: 'realestate',
    label: 'Real estate',
    seller: 'Harbourline Realty',
    sellerBlurb: 'a residential brokerage listing apartments and townhouses',
    terminology: { deal: 'offer', customer: 'buyer', meeting: 'viewing', pipeline: 'buyer pipeline' },
    inbox: { social: 'Property portal enquiries', default: 'Property portal enquiries' },
    call: 'Phone call',
    nextStepTypes: ['Property viewing', 'Video tour', 'Mortgage adviser intro', 'Offer meeting'],
    products: [
      { id: 'marina-2br', name: '2BR Marina View Apartment', price: 420000, maxDiscountPct: 3, stock: 1, leadDays: 30, specs: ['112 m²', 'Sea view, 14th floor', '25 min to Greenfield School'], tags: ['marina', 'view', 'apartment'] },
      { id: 'garden-2br', name: '2BR Garden Apartment, Palm Grove', price: 455000, maxDiscountPct: 3, stock: 1, leadDays: 30, specs: ['120 m² + garden', 'Ground floor', '5 min walk to Greenfield School'], tags: ['school', 'family', 'garden'] },
      { id: 'townhouse-3br', name: '3BR Townhouse, Palm Grove', price: 610000, maxDiscountPct: 2, stock: 1, leadDays: 45, specs: ['185 m²', 'Private parking', '7 min to Greenfield School'], tags: ['townhouse', 'family', 'large'] },
      { id: 'loft-1br', name: '1BR Loft, Downtown', price: 265000, maxDiscountPct: 4, stock: 1, leadDays: 30, specs: ['68 m²', 'High ceilings', 'Walk to metro'], tags: ['investment', 'small'] },
    ],
    customer: {
      name: 'Sofia Martins',
      handle: 'Portal enquiry #4471',
      role: 'Relocating parent buying a family home',
      personality: 'Organised and polite, asks precise questions, sceptical of agent hype.',
      hiddenMotivation:
        'Her family is relocating for her husband’s job. Their 8-year-old starts at Greenfield School next term, so being near the school matters more than the view. Mortgage pre-approved to about {{$460000}}.',
      opening: 'Hello, is the 2BR Marina View apartment still available? What is the best price?',
      facts: {
        need: 'We are relocating with our daughter, she starts at Greenfield School, so the commute matters.',
        budget: 'Our mortgage is pre-approved up to about {{$460000}}.',
        timeline: 'School starts in two months, so we need to move quickly.',
        decision: 'My husband is still abroad, so he will join viewings by video and we decide together.',
        competitor: 'Another agency showed us a similar apartment last week.',
      },
      objections: [
        { id: 'price', trigger: 'price', text: 'The listing seems high for the area. Will the seller negotiate?' },
        { id: 'commute', trigger: 'product', text: 'How long is the drive to Greenfield School at rush hour?' },
        { id: 'remote', trigger: 'decision', text: 'My husband can’t visit in person. How can he be confident?' },
      ],
      idealProducts: ['garden-2br'],
      callGoal: 'Sofia calls after the chat. Her husband has seen the listing and worries about the ground-floor apartment’s security.',
      callObjection: { id: 'security', text: 'My husband is worried a ground-floor apartment is less secure. What would you say to him?' },
    },
    leads: [
      {
        id: 'L1', name: 'R. Haddad', company: 'Portal enquiry (no message)', source: 'Clicked "Request info" on 1BR Loft', valueUsd: 1590000, gem: true,
        profile: 'No message. Company email domain: haddad-holdings.example.',
        dims: {
          productFit: { v: 0.9, fact: 'We buy one-bedroom units for rental yield.' },
          need: { v: 0.8, fact: 'We are building a rental portfolio of six units.' },
          intent: { v: 0.8, fact: 'Funds are ready.' },
          timeline: { v: 0.7, fact: 'Within the next quarter.' },
          decision: { v: 0.7, fact: 'I decide with my business partner.' },
          engagement: { v: 0.4, fact: 'Slow to reply.' },
        },
        known: [],
      },
      {
        id: 'L2', name: 'The Clarke family', company: 'Open house sign-in', source: 'Open house, Townhouse', valueUsd: 610000,
        profile: 'Spent 40 minutes at the townhouse open house, asked about schools.',
        dims: {
          productFit: { v: 0.8, fact: 'Three bedrooms is what we need.' },
          need: { v: 0.8, fact: 'Our lease ends soon.' },
          intent: { v: 0.6, fact: 'Seriously considering.' },
          timeline: { v: 0.7, fact: 'Lease ends in three months.' },
          decision: { v: 0.8, fact: 'We both decide.' },
          engagement: { v: 0.8, fact: 'Responsive.' },
        },
        known: ['productFit', 'engagement'],
      },
      {
        id: 'L3', name: 'Vik Rao', company: 'WhatsApp', source: 'Referral from a past client', valueUsd: 420000,
        profile: 'Referred by a past buyer. Asked "anything with a sea view?"',
        dims: {
          productFit: { v: 0.7, fact: 'Sea view is a must.' },
          need: { v: 0.5, fact: 'Upgrade from our current flat.' },
          intent: { v: 0.5, fact: 'Depends on selling our flat first.' },
          timeline: { v: 0.3, fact: 'Once our flat sells, maybe 6 months.' },
          decision: { v: 0.7, fact: 'Me and my wife.' },
          engagement: { v: 0.7, fact: 'Replies the same day.' },
        },
        known: ['engagement'],
      },
      {
        id: 'L4', name: 'Hannah Kim', company: 'Portal enquiry', source: 'Saved 12 listings', valueUsd: 300000,
        profile: 'Saved 12 listings across three areas. No contact yet.',
        dims: {
          productFit: { v: 0.4, fact: 'Not sure what area we want.' },
          need: { v: 0.5, fact: 'First home.' },
          intent: { v: 0.4, fact: 'Still researching.' },
          timeline: { v: 0.3, fact: 'Next year probably.' },
          decision: { v: 0.6, fact: 'Me and my parents.' },
          engagement: { v: 0.5, fact: 'Occasional replies.' },
        },
        known: [],
      },
      {
        id: 'L5', name: 'Marco D.', company: 'Phone enquiry', source: 'Called about rentals', valueUsd: 0,
        profile: 'Asked if Harbourline has rentals under {{$1500}} a month.',
        dims: {
          productFit: { v: 0.1, fact: 'Looking to rent, not buy.' },
          need: { v: 0.6, fact: 'Need a place next month.' },
          intent: { v: 0.1, fact: 'Not buying.' },
          timeline: { v: 0.8, fact: 'Next month.' },
          decision: { v: 0.9, fact: 'My decision.' },
          engagement: { v: 0.8, fact: 'Responsive.' },
        },
        known: ['productFit'],
      },
    ],
  },

  industrial: {
    id: 'industrial',
    label: 'Industrial / engineering',
    seller: 'Corvane Industrial Supply',
    sellerBlurb: 'a distributor of pumps, valves and maintenance parts for process plants',
    terminology: { deal: 'order', customer: 'buyer', meeting: 'technical meeting', pipeline: 'RFQ pipeline' },
    inbox: { social: 'Email RFQ inbox', default: 'Email RFQ inbox' },
    call: 'Technical call',
    nextStepTypes: ['Site visit', 'Technical clarification call', 'Formal quotation', 'Sample / datasheet review'],
    products: [
      { id: 'cv200', name: 'CV-200 Centrifugal Pump', price: 4800, maxDiscountPct: 8, stock: 10, leadDays: 14, specs: ['Rated 120 m³/h', 'ISO 9906 Grade 2B tested', 'Cast iron'], tags: ['pump', 'standard'] },
      { id: 'cv350', name: 'CV-350 High-Flow Pump', price: 7900, maxDiscountPct: 8, stock: 4, leadDays: 28, specs: ['Rated 220 m³/h', 'ISO 9906 Grade 2B tested', 'Duplex stainless'], tags: ['pump', 'high flow', 'water treatment'] },
      { id: 'valve316', name: 'SS316 Ball Valve 2"', price: 310, maxDiscountPct: 12, stock: 120, leadDays: 5, specs: ['PN40', 'Full bore', 'Lockable handle'], tags: ['valve'] },
      { id: 'kit', name: 'Pump Maintenance Kit', price: 650, maxDiscountPct: 10, stock: 30, leadDays: 7, specs: ['Seals, bearings, gaskets', 'Fits CV-200/350'], tags: ['spares', 'maintenance'] },
    ],
    customer: {
      name: 'Erik Lindqvist',
      handle: 'e.lindqvist@aquaterra-utilities.example',
      role: 'Plant engineer at a municipal water-treatment operator',
      personality: 'Precise, data-driven, dislikes sales talk without specifications.',
      hiddenMotivation:
        'He must upgrade six pumps to handle 180 m³/h each before a regulatory inspection. Procurement requires three compliant quotes, and the tender closes in 10 days.',
      opening: 'Hello, please send pricing for 6 pumps for our water treatment upgrade, plus datasheets.',
      facts: {
        need: 'Each pump must deliver 180 m³/h for the new filtration line.',
        budget: 'The approved capex for pumps is about {{$50000}}.',
        timeline: 'The tender closes in 10 days and installation must finish before the inspection in 3 months.',
        decision: 'I sign off the technical side, procurement compares three quotes on price and lead time.',
        competitor: 'We have quotes coming from two other distributors.',
      },
      objections: [
        { id: 'price', trigger: 'price', text: 'Another supplier is about 10% lower. Can you match that?' },
        { id: 'leadtime', trigger: 'timeline', text: 'Your lead time looks long. We cannot miss the inspection.' },
        { id: 'compliance', trigger: 'product', text: 'Are your pumps tested to ISO 9906? Procurement will reject anything without certificates.' },
      ],
      idealProducts: ['cv350'],
      callGoal: 'Erik agreed to a technical call. Procurement has asked whether you can deliver in stages.',
      callObjection: { id: 'staging', text: 'You only have 4 of the high-flow pumps in stock. Procurement wants all six on time.' },
    },
    leads: [
      {
        id: 'L1', name: 'N. Osei', company: 'n.osei@outlook.example', source: 'Datasheet download', valueUsd: 420000, gem: true,
        profile: 'Downloaded the CV-350 datasheet three times. Personal email.',
        dims: {
          productFit: { v: 0.9, fact: 'I am specifying pumps for a desalination plant expansion.' },
          need: { v: 0.9, fact: 'We need around 50 high-flow pumps over two phases.' },
          intent: { v: 0.7, fact: 'We are pre-qualifying suppliers now.' },
          timeline: { v: 0.6, fact: 'First phase order in about 4 months.' },
          decision: { v: 0.6, fact: 'I am the consulting engineer; the EPC contractor buys.' },
          engagement: { v: 0.4, fact: 'Replies after a couple of days.' },
        },
        known: [],
      },
      {
        id: 'L2', name: 'Hamid Q.', company: 'Gulf Bottling Co.', source: 'Phone RFQ', valueUsd: 9600,
        profile: 'Called asking for 2 × CV-200 urgently to replace failed pumps.',
        dims: {
          productFit: { v: 0.9, fact: 'Two CV-200s, same as our old ones.' },
          need: { v: 0.9, fact: 'Our line is down.' },
          intent: { v: 0.9, fact: 'Purchase order ready.' },
          timeline: { v: 1, fact: 'Need them this week.' },
          decision: { v: 0.9, fact: 'I am maintenance manager and can approve.' },
          engagement: { v: 0.9, fact: 'Calling twice a day.' },
        },
        known: ['productFit', 'timeline', 'engagement'],
      },
      {
        id: 'L3', name: 'Lena Fischer', company: 'Brenner Chemicals', source: 'Trade-show badge scan', valueUsd: 25000,
        profile: 'Scanned at the stand. Note: "valves, maybe next budget".',
        dims: {
          productFit: { v: 0.7, fact: 'We use lots of 2" stainless valves.' },
          need: { v: 0.5, fact: 'Standardising suppliers.' },
          intent: { v: 0.4, fact: 'Next budget cycle.' },
          timeline: { v: 0.3, fact: 'After April.' },
          decision: { v: 0.6, fact: 'Procurement committee.' },
          engagement: { v: 0.5, fact: 'Replies in a few days.' },
        },
        known: [],
      },
      {
        id: 'L4', name: 'Ops desk', company: 'Metro Facilities Ltd', source: 'Web form', valueUsd: 1300,
        profile: 'Asked for "price list for maintenance kits".',
        dims: {
          productFit: { v: 0.8, fact: 'Kits for our CV-200 fleet.' },
          need: { v: 0.6, fact: 'Planned maintenance.' },
          intent: { v: 0.7, fact: 'Will order quarterly.' },
          timeline: { v: 0.6, fact: 'Next month.' },
          decision: { v: 0.7, fact: 'Facility manager approves.' },
          engagement: { v: 0.6, fact: 'Replies same week.' },
        },
        known: ['productFit'],
      },
      {
        id: 'L5', name: 'J. Wright', company: 'Competitor distributor', source: 'Email', valueUsd: 0,
        profile: 'Asked for your full price list "for a project".',
        dims: {
          productFit: { v: 0.2, fact: 'Just want your price list.' },
          need: { v: 0.1, fact: 'Benchmarking.' },
          intent: { v: 0, fact: 'No purchase planned.' },
          timeline: { v: 0, fact: 'None.' },
          decision: { v: 0.1, fact: 'Not relevant.' },
          engagement: { v: 0.6, fact: 'Replies quickly.' },
        },
        known: [],
      },
    ],
  },
}

export { packIdForProfile } from '../../src/training/packs.js'

// Renders {{$1100}} money tokens in the region's display currency.
const cache = new Map()
export function localizedPack(id, region, format) {
  const key = `${id}|${region}`
  if (!cache.has(key)) {
    const render = (v) =>
      typeof v === 'string'
        ? v.replace(/\{\{\$(\d+)\}\}/g, (_, usd) => format(Number(usd), region))
        : Array.isArray(v)
          ? v.map(render)
          : v && typeof v === 'object'
            ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, render(x)]))
            : v
    cache.set(key, render(packs[id]))
  }
  return cache.get(key)
}
