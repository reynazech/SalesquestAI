// Mirrors server/sim/engine.js RUBRIC (labels only).
export const RUBRIC_LABELS = [
  { id: 'understanding', label: 'Customer understanding' },
  { id: 'listening', label: 'Communication & listening' },
  { id: 'recommendation', label: 'Product recommendation' },
  { id: 'qualification', label: 'Lead qualification' },
  { id: 'objections', label: 'Objection handling' },
  { id: 'ethics', label: 'Ethical persuasion' },
  { id: 'workflow', label: 'Sales workflow execution' },
  { id: 'nextSteps', label: 'Next steps & outcome' },
]

export const scoreColor = (s) => (s >= 75 ? 'text-lime' : s >= 50 ? 'text-sky' : 'text-coral')
export const barColor = (s) => (s >= 75 ? 'bg-lime' : s >= 50 ? 'bg-sky' : 'bg-coral')
