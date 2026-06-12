/** Static team tasks for Admin 3 Team section (display only). */
export const ADMIN3_TEAM_TASKS = [
  {
    id: 'task-1',
    title: 'June investor performance reports',
    description: 'Finalize monthly PDF summaries and upload to the investor portal.',
    status: 'in_progress',
    assignees: [
      { name: 'Daniel G.', initials: 'DG', color: '#3b82f6' },
      { name: 'Carlos S.', initials: 'CS', color: '#10b981' }
    ],
    dueLabel: 'Due Friday'
  },
  {
    id: 'task-2',
    title: 'Consultation follow-up queue',
    description: 'Review pending consultation requests and assign operator callbacks.',
    status: 'in_progress',
    assignees: [
      { name: 'Daniel G.', initials: 'DG', color: '#3b82f6' },
      { name: 'Manuel F.', initials: 'MF', color: '#8b5cf6' }
    ],
    dueLabel: 'Ongoing'
  },
  {
    id: 'task-3',
    title: 'Wire deposit reconciliation',
    description: 'Match incoming wires against pending deposit notifications for the week.',
    status: 'pending',
    assignees: [
      { name: 'Carlos S.', initials: 'CS', color: '#10b981' }
    ],
    dueLabel: 'Due tomorrow'
  },
  {
    id: 'task-4',
    title: 'Q2 compliance documentation',
    description: 'Collect signed attestations and archive in the internal compliance folder.',
    status: 'pending',
    assignees: [
      { name: 'Manuel F.', initials: 'MF', color: '#8b5cf6' },
      { name: 'Elena R.', initials: 'ER', color: '#f59e0b' }
    ],
    dueLabel: 'Due next week'
  },
  {
    id: 'task-5',
    title: 'Support message triage',
    description: 'Prioritize investor messages flagged with unread alerts in Support.',
    status: 'in_progress',
    assignees: [
      { name: 'Daniel G.', initials: 'DG', color: '#3b82f6' },
      { name: 'Carlos S.', initials: 'CS', color: '#10b981' },
      { name: 'Manuel F.', initials: 'MF', color: '#8b5cf6' }
    ],
    dueLabel: 'Today'
  },
  {
    id: 'task-6',
    title: 'Onboarding packet refresh',
    description: 'Update welcome PDF and KYC checklist for new investor applications.',
    status: 'not_initialized',
    assignees: [],
    dueLabel: 'Unscheduled'
  },
  {
    id: 'task-7',
    title: 'Portfolio risk band review',
    description: 'Audit accounts approaching maximum crude exposure limits.',
    status: 'pending',
    assignees: [
      { name: 'Elena R.', initials: 'ER', color: '#f59e0b' }
    ],
    dueLabel: 'Due Thursday'
  },
  {
    id: 'task-8',
    title: 'Email campaign: monthly outlook',
    description: 'Draft and approve the investor newsletter for the upcoming month.',
    status: 'not_initialized',
    assignees: [
      { name: 'Carlos S.', initials: 'CS', color: '#10b981' }
    ],
    dueLabel: 'Starts Monday'
  },
  {
    id: 'task-9',
    title: 'CRM data cleanup',
    description: 'Merge duplicate contact records and verify consultation history links.',
    status: 'not_initialized',
    assignees: [],
    dueLabel: 'Backlog'
  },
  {
    id: 'task-10',
    title: 'Withdrawal processing batch',
    description: 'Confirm net amounts and release approved redemptions to operations.',
    status: 'in_progress',
    assignees: [
      { name: 'Manuel F.', initials: 'MF', color: '#8b5cf6' },
      { name: 'Elena R.', initials: 'ER', color: '#f59e0b' }
    ],
    dueLabel: 'Due Wed'
  }
]

export const TEAM_TASK_STATUS_META = {
  in_progress: { label: 'In Progress', className: 'status-in-progress' },
  pending: { label: 'Pending', className: 'status-pending' },
  not_initialized: { label: 'Not Initialized', className: 'status-not-initialized' }
}
