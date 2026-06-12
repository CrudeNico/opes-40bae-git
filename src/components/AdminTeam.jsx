import React, { useMemo } from 'react'
import { ADMIN3_TEAM_TASKS, TEAM_TASK_STATUS_META } from '../utils/admin3TeamTasks'
import './AdminTeam.css'

const AdminTeam = () => {
  const tasks = ADMIN3_TEAM_TASKS

  const summary = useMemo(() => {
    const counts = { in_progress: 0, pending: 0, not_initialized: 0 }
    tasks.forEach((task) => {
      if (counts[task.status] != null) counts[task.status] += 1
    })
    const activeAssignees = new Set()
    tasks.forEach((task) => {
      task.assignees.forEach((a) => activeAssignees.add(a.name))
    })
    return {
      total: tasks.length,
      ...counts,
      activeAdmins: activeAssignees.size
    }
  }, [tasks])

  return (
    <div className="admin-team-container">
      <header className="admin-team-header">
        <div>
          <h1 className="admin-team-title">Team</h1>
          <p className="admin-team-subtitle">
            Active workstreams assigned across the operations team.
          </p>
        </div>
      </header>

      <div className="admin-team-summary-grid">
        <div className="admin-team-summary-card">
          <span className="admin-team-summary-label">Open tasks</span>
          <span className="admin-team-summary-value">{summary.total}</span>
        </div>
        <div className="admin-team-summary-card summary-in-progress">
          <span className="admin-team-summary-label">In progress</span>
          <span className="admin-team-summary-value">{summary.in_progress}</span>
        </div>
        <div className="admin-team-summary-card summary-pending">
          <span className="admin-team-summary-label">Pending</span>
          <span className="admin-team-summary-value">{summary.pending}</span>
        </div>
        <div className="admin-team-summary-card summary-not-initialized">
          <span className="admin-team-summary-label">Not initialized</span>
          <span className="admin-team-summary-value">{summary.not_initialized}</span>
        </div>
        <div className="admin-team-summary-card">
          <span className="admin-team-summary-label">Admins on tasks</span>
          <span className="admin-team-summary-value">{summary.activeAdmins}</span>
        </div>
      </div>

      <div className="admin-team-tasks-grid">
        {tasks.map((task) => {
          const statusMeta = TEAM_TASK_STATUS_META[task.status] || TEAM_TASK_STATUS_META.pending
          return (
            <article key={task.id} className={`admin-team-task-card ${statusMeta.className}`}>
              <div className="admin-team-task-card-top">
                <span className={`admin-team-status-badge ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
                <span className="admin-team-due-label">{task.dueLabel}</span>
              </div>
              <h3 className="admin-team-task-title">{task.title}</h3>
              <p className="admin-team-task-description">{task.description}</p>
              <div className="admin-team-task-footer">
                <span className="admin-team-assignees-label">Assigned</span>
                {task.assignees.length > 0 ? (
                  <div className="admin-team-assignees">
                    {task.assignees.map((assignee) => (
                      <div
                        key={`${task.id}-${assignee.name}`}
                        className="admin-team-assignee"
                        title={assignee.name}
                      >
                        <span
                          className="admin-team-assignee-avatar"
                          style={{ background: assignee.color }}
                        >
                          {assignee.initials}
                        </span>
                        <span className="admin-team-assignee-name">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="admin-team-unassigned">No admin assigned yet</span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default AdminTeam
